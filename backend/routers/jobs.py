import logging

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy.orm import Session

from database import SessionLocal, get_db
from models import Asset, GenerationTask, Job, JobScript, JobScriptSegment, Video
from schemas import (
    AssetResponse,
    GenerationTaskResponse,
    JobActionResponse,
    JobCreate,
    JobDetailResponse,
    JobResponse,
    JobScriptSegmentResponse,
    JobScriptResponse,
    VideoResponse,
)
from services.job_runner import run_job
from services.task_manager import task_manager

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/jobs", tags=["jobs"])


def _new_db() -> Session:
    return SessionLocal()


def _serialize_job_detail(db: Session, job: Job) -> JobDetailResponse:
    scripts = (
        db.query(JobScript)
        .filter(JobScript.job_id == job.id)
        .order_by(JobScript.id.asc())
        .all()
    )
    script_items = []
    for script in scripts:
        segments = (
            db.query(JobScriptSegment)
            .filter(JobScriptSegment.job_script_id == script.id)
            .order_by(JobScriptSegment.segment_index.asc())
            .all()
        )
        script_items.append(
            JobScriptResponse(
                **JobScriptResponse.model_validate(script).model_dump(exclude={"segments"}),
                segments=[
                    JobScriptSegmentResponse.model_validate(segment) for segment in segments
                ],
            )
        )

    source_video = None
    if job.source_video_id:
        source_video = db.query(Video).filter(Video.id == job.source_video_id).first()

    return JobDetailResponse(
        **JobResponse.model_validate(job).model_dump(),
        scripts=script_items,
        assets=[
            AssetResponse.model_validate(asset)
            for asset in db.query(Asset).filter(Asset.job_id == job.id).order_by(Asset.id.asc()).all()
        ],
        generation_tasks=[
            GenerationTaskResponse.model_validate(task)
            for task in db.query(GenerationTask)
            .filter(GenerationTask.job_id == job.id)
            .order_by(GenerationTask.id.asc())
            .all()
        ],
        source_video=VideoResponse.model_validate(source_video) if source_video else None,
    )


@router.get("", response_model=list[JobResponse])
def list_jobs(db: Session = Depends(get_db)):
    jobs = db.query(Job).order_by(Job.updated_at.desc(), Job.id.desc()).all()
    return [JobResponse.model_validate(job) for job in jobs]


@router.post("", response_model=JobResponse, status_code=201)
def create_job(body: JobCreate, db: Session = Depends(get_db)):
    if body.job_type not in {"story_rewrite", "ai_video_generation"}:
        raise HTTPException(status_code=400, detail="Unsupported job type")

    source_video = None
    if body.source_video_id is not None:
        source_video = db.query(Video).filter(Video.id == body.source_video_id).first()
        if not source_video:
            raise HTTPException(status_code=404, detail="Source video not found")

    image_urls = "\n".join(body.image_urls or []) if body.image_urls else None
    title = body.title.strip()
    if not title and source_video and source_video.title:
        title = source_video.title
    if not title:
        raise HTTPException(status_code=400, detail="Title is required")

    job = Job(
        job_type=body.job_type,
        title=title,
        source_video_id=body.source_video_id,
        input_mode=body.input_mode,
        topic=body.topic,
        description=body.description,
        prompt=body.prompt,
        provider=body.provider,
        aspect_ratio=body.aspect_ratio,
        image_urls=image_urls,
        language=body.language,
        tone=body.tone,
        target_duration=body.target_duration,
        status="draft",
        review_status="pending" if body.review_required else "not_required",
        current_step="等待執行",
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    return JobResponse.model_validate(job)


@router.get("/{job_id}", response_model=JobDetailResponse)
def get_job(job_id: int, db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return _serialize_job_detail(db, job)


@router.post("/{job_id}/run", response_model=JobActionResponse)
def start_job(job_id: int, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    task_id = task_manager.create_task("job-run", f"Running job #{job.id}: {job.title}", total=4)
    job.status = "queued"
    job.current_step = "已排入背景任務"
    db.commit()
    background_tasks.add_task(_bg_run_job, job_id, task_id)
    return JobActionResponse(job_id=job.id, task_id=task_id, message="任務已開始執行")


async def _bg_run_job(job_id: int, task_id: str):
    db = _new_db()
    try:
        job = db.query(Job).filter(Job.id == job_id).first()
        if not job:
            task_manager.update_task(task_id, status="failed", message="Job not found")
            return
        task_manager.update_task(task_id, progress_current=1, message="初始化任務")
        await run_job(db, job)
        task_manager.update_task(task_id, progress_current=4, progress_total=4)
        final_status = "completed" if job.status != "failed" else "failed"
        task_manager.update_task(
            task_id,
            status=final_status,
            message=job.result_summary or job.current_step or "任務完成",
        )
    except Exception as exc:
        logger.exception("job run failed")
        job = db.query(Job).filter(Job.id == job_id).first()
        if job:
            job.status = "failed"
            job.current_step = "任務執行失敗"
            job.error_message = str(exc)
            db.commit()
        task_manager.update_task(task_id, status="failed", message=str(exc))
    finally:
        db.close()


@router.post("/{job_id}/retry", response_model=JobActionResponse)
def retry_job(job_id: int, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    task_id = task_manager.create_task("job-retry", f"Retrying job #{job.id}", total=4)
    job.status = "queued"
    job.current_step = "重新排入背景任務"
    job.error_message = None
    db.commit()
    background_tasks.add_task(_bg_run_job, job_id, task_id)
    return JobActionResponse(job_id=job.id, task_id=task_id, message="任務已重新執行")


@router.post("/{job_id}/approve", response_model=JobActionResponse)
def approve_job(
    job_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    job.review_status = "approved"
    task_id = None
    if job.job_type == "story_rewrite":
        task_id = task_manager.create_task("job-approve", f"Approving job #{job.id}", total=4)
        job.status = "queued"
        job.current_step = "審核通過，開始生成成片"
        background_tasks.add_task(_bg_run_job, job.id, task_id)
    elif job.status == "pending_review":
        job.status = "completed"
        job.current_step = "審核通過"
    db.commit()
    return JobActionResponse(job_id=job.id, task_id=task_id, message="任務已審核通過")


@router.post("/{job_id}/reject", response_model=JobActionResponse)
def reject_job(job_id: int, db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    job.review_status = "rejected"
    job.status = "rejected"
    job.current_step = "審核駁回"
    db.commit()
    return JobActionResponse(job_id=job.id, message="任務已駁回")
