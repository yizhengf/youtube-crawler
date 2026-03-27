"""Crawl endpoints — all long-running work runs in background tasks."""

import json
import logging
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy.orm import Session

from database import SessionLocal, get_db
from models import Channel, Setting, Video
from schemas import TaskResponse
from services.task_manager import task_manager
from services import youtube as yt_service

logger = logging.getLogger(__name__)

router = APIRouter(tags=["crawl"])


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _get_api_key(db: Session) -> str:
    row = db.query(Setting).filter(Setting.key == "youtube_api_key").first()
    if not row or not row.value:
        raise HTTPException(status_code=400, detail="YouTube API key not configured")
    return row.value


def _new_db() -> Session:
    """Create a fresh session for use inside background tasks."""
    return SessionLocal()


def _parse_dt(val) -> Optional[datetime]:
    if not val:
        return None
    if isinstance(val, datetime):
        return val
    try:
        return datetime.fromisoformat(val.replace("Z", "+00:00"))
    except Exception:
        return None


# ---------------------------------------------------------------------------
# POST /api/channels/{id}/resolve
# ---------------------------------------------------------------------------

@router.post("/api/channels/{channel_db_id}/resolve")
def resolve_channel(
    channel_db_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    channel = db.query(Channel).filter(Channel.id == channel_db_id).first()
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")
    api_key = _get_api_key(db)
    task_id = task_manager.create_task("resolve", f"Resolving channel {channel.url}")
    background_tasks.add_task(_bg_resolve, channel_db_id, api_key, task_id)
    return {"task_id": task_id, "message": "Resolve started"}


async def _bg_resolve(channel_db_id: int, api_key: str, task_id: str):
    db = _new_db()
    try:
        channel = db.query(Channel).filter(Channel.id == channel_db_id).first()
        if not channel:
            task_manager.update_task(task_id, status="failed", message="Channel not found")
            return

        resolved_id = await yt_service.resolve_channel_id(channel.url, api_key)
        channel.channel_id = resolved_id
        channel.status = "準備爬蟲"
        db.commit()
        task_manager.update_task(
            task_id, status="completed", progress_current=1, progress_total=1,
            message=f"Resolved to {resolved_id}",
        )
    except Exception as e:
        logger.exception("resolve failed")
        task_manager.update_task(task_id, status="failed", message=str(e))
    finally:
        db.close()


# ---------------------------------------------------------------------------
# POST /api/channels/{id}/crawl-videos
# ---------------------------------------------------------------------------

@router.post("/api/channels/{channel_db_id}/crawl-videos")
def crawl_videos(
    channel_db_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    channel = db.query(Channel).filter(Channel.id == channel_db_id).first()
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")
    if not channel.channel_id:
        raise HTTPException(status_code=400, detail="Channel ID not resolved yet")
    api_key = _get_api_key(db)
    task_id = task_manager.create_task("crawl-videos", f"Crawling videos for {channel.channel_id}")
    background_tasks.add_task(
        _bg_crawl_videos, channel_db_id, channel.channel_id, channel.type_of_video, api_key, task_id
    )
    return {"task_id": task_id, "message": "Video crawl started"}


async def _bg_crawl_videos(
    channel_db_id: int,
    yt_channel_id: str,
    type_of_video: Optional[str],
    api_key: str,
    task_id: str,
):
    db = _new_db()
    try:
        task_manager.update_task(task_id, message="Fetching video list from YouTube...")
        videos = await yt_service.search_channel_videos(yt_channel_id, api_key)
        task_manager.update_task(task_id, progress_total=len(videos), message=f"Found {len(videos)} videos")

        added = 0
        for i, v in enumerate(videos):
            existing = db.query(Video).filter(Video.video_id == v["video_id"]).first()
            if not existing:
                new_video = Video(
                    channel_id=yt_channel_id,
                    video_id=v["video_id"],
                    title=v.get("title"),
                    url=f"https://www.youtube.com/watch?v={v['video_id']}",
                    thumbnail=v.get("thumbnail"),
                    published_at=_parse_dt(v.get("published_at")),
                    type_of_video=type_of_video,
                    status="準備爬蟲",
                )
                db.add(new_video)
                added += 1
            task_manager.update_task(task_id, progress_current=i + 1)

        db.commit()

        # Update channel status
        channel = db.query(Channel).filter(Channel.id == channel_db_id).first()
        if channel:
            channel.status = "準備爬蟲"
            db.commit()

        task_manager.update_task(
            task_id, status="completed", progress_current=len(videos),
            message=f"Added {added} new videos (total found: {len(videos)})",
        )
    except Exception as e:
        logger.exception("crawl-videos failed")
        task_manager.update_task(task_id, status="failed", message=str(e))
    finally:
        db.close()


# ---------------------------------------------------------------------------
# POST /api/channels/{id}/crawl-stats
# ---------------------------------------------------------------------------

@router.post("/api/channels/{channel_db_id}/crawl-stats")
def crawl_stats(
    channel_db_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    channel = db.query(Channel).filter(Channel.id == channel_db_id).first()
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")
    if not channel.channel_id:
        raise HTTPException(status_code=400, detail="Channel ID not resolved yet")
    api_key = _get_api_key(db)
    task_id = task_manager.create_task("crawl-stats", f"Crawling stats for {channel.channel_id}")
    background_tasks.add_task(_bg_crawl_stats, channel.channel_id, channel_db_id, api_key, task_id)
    return {"task_id": task_id, "message": "Stats crawl started"}


async def _bg_crawl_stats(
    yt_channel_id: str,
    channel_db_id: int,
    api_key: str,
    task_id: str,
):
    db = _new_db()
    try:
        pending = (
            db.query(Video)
            .filter(Video.channel_id == yt_channel_id, Video.status == "準備爬蟲")
            .all()
        )
        if not pending:
            task_manager.update_task(
                task_id, status="completed", message="No videos pending stats crawl"
            )
            return

        video_ids = [v.video_id for v in pending]
        task_manager.update_task(
            task_id, progress_total=len(video_ids),
            message=f"Fetching stats for {len(video_ids)} videos...",
        )

        details = await yt_service.get_video_details(video_ids, api_key)
        details_map = {d["video_id"]: d for d in details}

        for i, video in enumerate(pending):
            d = details_map.get(video.video_id)
            if d:
                video.title = d.get("title") or video.title
                video.description = d.get("description")
                video.published_at = _parse_dt(d.get("published_at")) or video.published_at
                video.thumbnail = d.get("thumbnail") or video.thumbnail
                video.view_count = d.get("view_count")
                video.like_count = d.get("like_count")
                video.comment_count = d.get("comment_count")
                video.duration = d.get("duration")
                tags = d.get("tags")
                video.tags = json.dumps(tags, ensure_ascii=False) if tags else None
            video.status = "爬蟲完成"
            task_manager.update_task(task_id, progress_current=i + 1)

        db.commit()

        # Mark channel as done if all videos finished
        channel = db.query(Channel).filter(Channel.id == channel_db_id).first()
        if channel:
            channel.status = "爬蟲完成"
            db.commit()

        task_manager.update_task(
            task_id, status="completed", progress_current=len(video_ids),
            message=f"Updated stats for {len(details)} videos",
        )
    except Exception as e:
        logger.exception("crawl-stats failed")
        task_manager.update_task(task_id, status="failed", message=str(e))
    finally:
        db.close()


# ---------------------------------------------------------------------------
# POST /api/crawl/all
# ---------------------------------------------------------------------------

@router.post("/api/crawl/all")
def crawl_all(background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    api_key = _get_api_key(db)
    channels = db.query(Channel).all()
    if not channels:
        raise HTTPException(status_code=400, detail="No channels found")
    task_id = task_manager.create_task(
        "crawl-all", f"Full crawl for {len(channels)} channels", total=len(channels)
    )
    background_tasks.add_task(_bg_crawl_all, api_key, task_id)
    return {"task_id": task_id, "message": "Full crawl started"}


async def _bg_crawl_all(api_key: str, task_id: str):
    db = _new_db()
    try:
        channels = db.query(Channel).all()
        task_manager.update_task(task_id, progress_total=len(channels))

        for i, channel in enumerate(channels):
            ch_label = channel.handle or channel.url
            try:
                # Step 1: Resolve if needed
                if not channel.channel_id:
                    task_manager.update_task(task_id, message=f"[{i+1}/{len(channels)}] Resolving {ch_label}...")
                    resolved_id = await yt_service.resolve_channel_id(channel.url, api_key)
                    channel.channel_id = resolved_id
                    channel.status = "準備爬蟲"
                    db.commit()

                # Step 2: Crawl videos
                task_manager.update_task(task_id, message=f"[{i+1}/{len(channels)}] Crawling videos for {ch_label}...")
                videos = await yt_service.search_channel_videos(channel.channel_id, api_key)
                added = 0
                for v in videos:
                    existing = db.query(Video).filter(Video.video_id == v["video_id"]).first()
                    if not existing:
                        new_video = Video(
                            channel_id=channel.channel_id,
                            video_id=v["video_id"],
                            title=v.get("title"),
                            url=f"https://www.youtube.com/watch?v={v['video_id']}",
                            thumbnail=v.get("thumbnail"),
                            published_at=_parse_dt(v.get("published_at")),
                            type_of_video=channel.type_of_video,
                            status="準備爬蟲",
                        )
                        db.add(new_video)
                        added += 1
                db.commit()

                # Step 3: Crawl stats
                pending = (
                    db.query(Video)
                    .filter(Video.channel_id == channel.channel_id, Video.status == "準備爬蟲")
                    .all()
                )
                if pending:
                    task_manager.update_task(
                        task_id,
                        message=f"[{i+1}/{len(channels)}] Fetching stats for {len(pending)} videos of {ch_label}...",
                    )
                    video_ids = [v.video_id for v in pending]
                    details = await yt_service.get_video_details(video_ids, api_key)
                    details_map = {d["video_id"]: d for d in details}

                    for video in pending:
                        d = details_map.get(video.video_id)
                        if d:
                            video.title = d.get("title") or video.title
                            video.description = d.get("description")
                            video.published_at = _parse_dt(d.get("published_at")) or video.published_at
                            video.thumbnail = d.get("thumbnail") or video.thumbnail
                            video.view_count = d.get("view_count")
                            video.like_count = d.get("like_count")
                            video.comment_count = d.get("comment_count")
                            video.duration = d.get("duration")
                            tags = d.get("tags")
                            video.tags = json.dumps(tags, ensure_ascii=False) if tags else None
                        video.status = "爬蟲完成"
                    db.commit()

                channel.status = "爬蟲完成"
                db.commit()

            except Exception as e:
                logger.exception(f"Error processing channel {ch_label}")
                task_manager.update_task(
                    task_id,
                    message=f"[{i+1}/{len(channels)}] Error on {ch_label}: {e}",
                )

            task_manager.update_task(task_id, progress_current=i + 1)

        task_manager.update_task(
            task_id, status="completed",
            message=f"Completed full crawl for {len(channels)} channels",
        )
    except Exception as e:
        logger.exception("crawl-all failed")
        task_manager.update_task(task_id, status="failed", message=str(e))
    finally:
        db.close()


# ---------------------------------------------------------------------------
# GET /api/tasks/status
# ---------------------------------------------------------------------------

@router.get("/api/tasks/status", response_model=List[TaskResponse])
def get_task_status():
    tasks = task_manager.get_all_tasks()
    return tasks
