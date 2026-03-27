import json
from datetime import datetime
from typing import Optional

from sqlalchemy.orm import Session

from models import Asset, GenerationTask, Job, JobScript, JobScriptSegment, Setting, Video
from services.story_video_pipeline import run_story_video_pipeline


def _clear_job_outputs(db: Session, job: Job):
    script_ids = [
        row.id for row in db.query(JobScript.id).filter(JobScript.job_id == job.id).all()
    ]
    if script_ids:
        db.query(JobScriptSegment).filter(
            JobScriptSegment.job_script_id.in_(script_ids)
        ).delete(synchronize_session=False)
    db.query(JobScript).filter(JobScript.job_id == job.id).delete(synchronize_session=False)
    db.query(Asset).filter(Asset.job_id == job.id).delete(synchronize_session=False)
    db.query(GenerationTask).filter(GenerationTask.job_id == job.id).delete(
        synchronize_session=False
    )
    db.flush()


def _create_script(
    db: Session, job: Job, script_type: str, content: str, segments: Optional[list] = None
):
    script = JobScript(job_id=job.id, script_type=script_type, content=content, version=1)
    db.add(script)
    db.flush()
    for idx, seg in enumerate(segments or [], start=1):
        db.add(
            JobScriptSegment(
                job_script_id=script.id,
                segment_index=idx,
                text=seg["text"],
                image_prompt=seg.get("image_prompt"),
                video_prompt=seg.get("video_prompt"),
                duration_hint_seconds=seg.get("duration_hint_seconds"),
            )
        )
    return script


async def run_job(db: Session, job: Job):
    source_video = None
    if job.source_video_id:
        source_video = db.query(Video).filter(Video.id == job.source_video_id).first()

    _clear_job_outputs(db, job)
    job.status = "running"
    job.current_step = "準備任務內容"
    job.error_message = None
    db.commit()

    if job.job_type == "story_rewrite":
        await _run_story_rewrite(db, job, source_video)
    elif job.job_type == "ai_video_generation":
        _run_ai_video_generation(db, job, source_video)
    else:
        job.status = "failed"
        job.current_step = "不支援的任務類型"
        job.error_message = f"Unsupported job_type: {job.job_type}"
        db.commit()
        return

    if job.review_status == "pending":
        job.status = "pending_review"
        job.current_step = "等待人工審核"
    else:
        job.status = "completed"
        if not job.current_step or job.current_step == "等待人工審核":
            job.current_step = "任務完成"
    db.commit()


async def _run_story_rewrite(db: Session, job: Job, source_video: Optional[Video]):
    base_title = source_video.title if source_video and source_video.title else job.title
    base_topic = job.topic or base_title or "未命名主題"

    title_text = f"{base_topic}｜仿寫故事短片版本"
    outline = "\n".join(
        [
            "1. 用強烈 hook 開場，先拋出反常或危機。",
            "2. 交代主角與衝突來源，拉出懸念。",
            "3. 中段反轉，揭露更深層真相。",
            "4. 結尾收束並保留一個可延伸的餘味。",
        ]
    )

    narration_segments = [
        {
            "text": f"開場五秒直接丟出懸念：{base_topic} 背後其實藏著一個不對勁的訊號。",
            "image_prompt": "高張力開場、近景、強對比光影、懸疑氛圍",
            "video_prompt": "快速推鏡，畫面先給異常細節，再切主角反應",
            "duration_hint_seconds": 8,
        },
        {
            "text": "接著補上主角背景與事件線索，讓觀眾理解風險正在逼近。",
            "image_prompt": "角色建立鏡頭、環境資訊、電影感構圖",
            "video_prompt": "中景敘事、節奏穩定、字幕重點字高亮",
            "duration_hint_seconds": 12,
        },
        {
            "text": "中段要給一次反轉，把原本以為的答案推翻，讓故事繼續往前推。",
            "image_prompt": "反轉瞬間、畫面壓迫感提升、情緒拉滿",
            "video_prompt": "切鏡加快、音效停頓一下再進高潮",
            "duration_hint_seconds": 12,
        },
        {
            "text": "最後收束情緒，留下能讓觀眾想留言或追下一集的尾鉤。",
            "image_prompt": "結尾餘韻、背影或空景、情緒收束",
            "video_prompt": "慢鏡收尾，最後一句字卡停留 2 秒",
            "duration_hint_seconds": 8,
        },
    ]
    narration = "\n\n".join(seg["text"] for seg in narration_segments)
    prompt_bundle = {
        "style": job.tone or "懸疑、節奏快、短影音敘事",
        "language": job.language or "繁體中文",
        "target_duration": job.target_duration or 45,
        "reference_video_id": source_video.video_id if source_video else None,
        "notes": "此版本為 MVP 占位內容，用於串接任務中心與後續 AI provider。",
    }

    _create_script(db, job, "title", title_text)
    _create_script(db, job, "outline", outline)
    _create_script(db, job, "narration", narration, narration_segments)
    _create_script(
        db,
        job,
        "storyboard",
        "\n".join(
            f"段落 {idx}: {seg['video_prompt']}" for idx, seg in enumerate(narration_segments, start=1)
        ),
        narration_segments,
    )
    _create_script(
        db,
        job,
        "prompt_bundle",
        json.dumps(prompt_bundle, ensure_ascii=False, indent=2),
    )

    job.result_summary = "已產生仿寫標題、故事腳本、分鏡與 prompt bundle。"
    job.current_step = "腳本與分鏡已生成"
    db.commit()

    if job.review_status in {"approved", "not_required"}:
        openai_key = db.query(Setting).filter(Setting.key == "openai_api_key").first()
        fal_key = db.query(Setting).filter(Setting.key == "fal_api_key").first()
        job.current_step = "開始生成配音與影片"
        db.commit()
        await run_story_video_pipeline(
            db,
            job,
            fal_api_key=fal_key.value if fal_key and fal_key.value else None,
            openai_api_key=openai_key.value if openai_key and openai_key.value else None,
        )


def _run_ai_video_generation(db: Session, job: Job, source_video: Optional[Video]):
    prompt = job.prompt or job.description or (
        f"參考 {source_video.title}" if source_video and source_video.title else "請輸入影片生成描述"
    )
    storyboard_segments = [
        {
            "text": "鏡頭一：建立主場景與主視覺情緒。",
            "image_prompt": f"{prompt}，建立主視覺，電影感，細節清晰",
            "video_prompt": f"{prompt}，開場鏡頭，{job.aspect_ratio or '16:9'}",
            "duration_hint_seconds": 5,
        },
        {
            "text": "鏡頭二：推進核心動作或主體。",
            "image_prompt": f"{prompt}，中段動作鏡頭，節奏感強",
            "video_prompt": f"{prompt}，主體動作，中景轉近景",
            "duration_hint_seconds": 5,
        },
        {
            "text": "鏡頭三：用收尾畫面完成情緒落點。",
            "image_prompt": f"{prompt}，收尾畫面，情緒完整，光影層次",
            "video_prompt": f"{prompt}，結尾收束，停留品牌或主題字卡",
            "duration_hint_seconds": 4,
        },
    ]

    _create_script(
        db,
        job,
        "storyboard",
        "\n".join(seg["text"] for seg in storyboard_segments),
        storyboard_segments,
    )
    _create_script(
        db,
        job,
        "prompt_bundle",
        json.dumps(
            {
                "provider": job.provider or "sora",
                "aspect_ratio": job.aspect_ratio or "16:9",
                "prompt": prompt,
                "image_urls": (job.image_urls or "").split("\n") if job.image_urls else [],
            },
            ensure_ascii=False,
            indent=2,
        ),
    )

    gen_task = GenerationTask(
        job_id=job.id,
        task_type="video_generation",
        provider=job.provider or "sora",
        status="planned",
        request_payload=prompt,
        response_payload="Provider integration pending in current MVP.",
        started_at=datetime.utcnow(),
        finished_at=datetime.utcnow(),
    )
    db.add(gen_task)
    db.flush()

    db.add(
        Asset(
            job_id=job.id,
            asset_type="video",
            provider=job.provider or "sora",
            status="planned",
            source_url=None,
            local_path=None,
            metadata_json=json.dumps(
                {
                    "note": "待接入實際影片生成 provider",
                    "generation_task_id": gen_task.id,
                },
                ensure_ascii=False,
            ),
        )
    )
    job.result_summary = "已建立 AI 影片生成任務與分鏡，占位等待接入實際 provider。"
    job.current_step = "已建立影片生成任務"
    db.commit()
