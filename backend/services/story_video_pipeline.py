import json
from datetime import datetime
from pathlib import Path
from typing import Optional

from sqlalchemy.orm import Session

from models import Asset, GenerationTask, Job, JobScript, JobScriptSegment
from services.asset_storage import get_asset_web_path, get_job_asset_dir
from services.render_service import render_story_video
from services.tts_service import synthesize_to_audio


async def run_story_video_pipeline(
    db: Session,
    job: Job,
    fal_api_key: Optional[str] = None,
    openai_api_key: Optional[str] = None,
):
    narration_script = (
        db.query(JobScript)
        .filter(JobScript.job_id == job.id, JobScript.script_type == "narration")
        .order_by(JobScript.id.desc())
        .first()
    )
    if not narration_script:
        raise RuntimeError("Narration script not found")

    narration_segments = (
        db.query(JobScriptSegment)
        .filter(JobScriptSegment.job_script_id == narration_script.id)
        .order_by(JobScriptSegment.segment_index.asc())
        .all()
    )
    if not narration_segments:
        raise RuntimeError("Narration segments not found")

    job_dir = get_job_asset_dir(job.id)
    audio_path = job_dir / "narration.wav"
    video_path = job_dir / "story_video.mp4"

    tts_task = GenerationTask(
        job_id=job.id,
        task_type="tts",
        provider="fal" if fal_api_key else ("openai" if openai_api_key else "placeholder"),
        status="running",
        started_at=datetime.utcnow(),
    )
    db.add(tts_task)
    db.commit()
    db.refresh(tts_task)

    narration_text = "\n\n".join(segment.text for segment in narration_segments)
    tts_result = await synthesize_to_audio(
        narration_text,
        audio_path,
        fal_api_key=fal_api_key,
        openai_api_key=openai_api_key,
    )
    tts_task.status = "completed"
    tts_task.finished_at = datetime.utcnow()
    tts_task.response_payload = json.dumps(tts_result, ensure_ascii=False)
    db.commit()

    final_audio_path = audio_path
    if tts_result.get("output_path"):
        final_audio_path = job_dir / Path(tts_result["output_path"]).name

    db.add(
        Asset(
            job_id=job.id,
            asset_type="audio",
            provider=tts_result["provider"],
            source_url=get_asset_web_path(job.id, final_audio_path.name),
            local_path=str(final_audio_path),
            mime_type=tts_result.get("mime_type", "audio/wav"),
            status="ready",
            metadata_json=json.dumps(tts_result, ensure_ascii=False),
        )
    )
    db.commit()

    render_task = GenerationTask(
        job_id=job.id,
        task_type="render",
        provider="ffmpeg",
        status="running",
        request_payload=json.dumps(
            {
                "duration_seconds": tts_result["duration_seconds"],
                "aspect_ratio": job.aspect_ratio or "9:16",
                "with_subtitles": False,
            },
            ensure_ascii=False,
        ),
        started_at=datetime.utcnow(),
    )
    db.add(render_task)
    db.commit()
    db.refresh(render_task)

    try:
        render_result = render_story_video(
            audio_path=final_audio_path,
            output_path=video_path,
            duration_seconds=tts_result["duration_seconds"],
            aspect_ratio=job.aspect_ratio or "9:16",
        )
        render_task.status = "completed"
        render_task.finished_at = datetime.utcnow()
        render_task.response_payload = json.dumps(render_result, ensure_ascii=False)
        db.add(
            Asset(
                job_id=job.id,
                asset_type="video",
                provider="ffmpeg",
                source_url=get_asset_web_path(job.id, video_path.name),
                local_path=str(video_path),
                mime_type="video/mp4",
                status="ready",
                metadata_json=json.dumps(
                    {
                        "duration_seconds": tts_result["duration_seconds"],
                        "subtitle_burned": render_result.get("subtitle_burned", False),
                        "warning": render_result.get("warning"),
                    },
                    ensure_ascii=False,
                ),
            )
        )
        job.current_step = "影片已完成輸出"
        job.result_summary = "已完成真實配音與本地成片。"
        db.commit()
    except Exception as exc:
        render_task.status = "failed"
        render_task.finished_at = datetime.utcnow()
        render_task.response_payload = str(exc)
        job.current_step = "已完成配音，影片合成失敗"
        job.result_summary = "已完成配音，但本地影片合成失敗。請確認 ffmpeg 已安裝。"
        db.commit()
