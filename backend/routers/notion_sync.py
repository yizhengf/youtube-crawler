"""Notion sync endpoints."""

import logging
from typing import List

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy.orm import Session

from database import SessionLocal, get_db
from models import Channel, Setting, Video
from services.task_manager import task_manager
from services import notion as notion_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/notion", tags=["notion"])


def _get_setting(db: Session, key: str) -> str:
    row = db.query(Setting).filter(Setting.key == key).first()
    if not row or not row.value:
        raise HTTPException(status_code=400, detail=f"Setting '{key}' not configured")
    return row.value


def _new_db() -> Session:
    return SessionLocal()


# ---------------------------------------------------------------------------
# POST /api/notion/sync-channels
# ---------------------------------------------------------------------------

@router.post("/sync-channels")
def sync_channels(background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    token = _get_setting(db, "notion_token")
    db_id = _get_setting(db, "notion_channels_db_id")
    channels = db.query(Channel).all()
    if not channels:
        raise HTTPException(status_code=400, detail="No channels to sync")
    task_id = task_manager.create_task(
        "notion-sync-channels", f"Syncing {len(channels)} channels to Notion",
        total=len(channels),
    )
    background_tasks.add_task(_bg_sync_channels, token, db_id, task_id)
    return {"task_id": task_id, "message": "Channel sync started"}


async def _bg_sync_channels(token: str, db_id: str, task_id: str):
    db = _new_db()
    try:
        channels = db.query(Channel).all()
        task_manager.update_task(task_id, progress_total=len(channels))

        for i, channel in enumerate(channels):
            try:
                page_id = await notion_service.sync_channel_to_notion(channel, token, db_id)
                channel.notion_page_id = page_id
                db.commit()
            except Exception as e:
                logger.exception(f"Failed to sync channel {channel.id}")
                task_manager.update_task(
                    task_id,
                    message=f"Error syncing channel {channel.handle or channel.url}: {e}",
                )
            task_manager.update_task(task_id, progress_current=i + 1)

        task_manager.update_task(
            task_id, status="completed",
            message=f"Synced {len(channels)} channels to Notion",
        )
    except Exception as e:
        logger.exception("sync-channels failed")
        task_manager.update_task(task_id, status="failed", message=str(e))
    finally:
        db.close()


# ---------------------------------------------------------------------------
# POST /api/notion/sync-videos
# ---------------------------------------------------------------------------

@router.post("/sync-videos")
def sync_videos(background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    token = _get_setting(db, "notion_token")
    db_id = _get_setting(db, "notion_videos_db_id")
    videos = db.query(Video).filter(Video.status == "爬蟲完成").all()
    if not videos:
        raise HTTPException(status_code=400, detail="No crawled videos to sync")
    task_id = task_manager.create_task(
        "notion-sync-videos", f"Syncing {len(videos)} videos to Notion",
        total=len(videos),
    )
    background_tasks.add_task(_bg_sync_videos, token, db_id, task_id)
    return {"task_id": task_id, "message": "Video sync started"}


async def _bg_sync_videos(token: str, db_id: str, task_id: str):
    db = _new_db()
    try:
        videos = db.query(Video).filter(Video.status == "爬蟲完成").all()
        task_manager.update_task(task_id, progress_total=len(videos))

        synced = 0
        for i, video in enumerate(videos):
            try:
                page_id = await notion_service.sync_video_to_notion(video, token, db_id)
                video.notion_page_id = page_id
                db.commit()
                synced += 1
            except Exception as e:
                logger.exception(f"Failed to sync video {video.video_id}")
                # Continue with next video
            task_manager.update_task(task_id, progress_current=i + 1)

        task_manager.update_task(
            task_id, status="completed",
            message=f"Synced {synced}/{len(videos)} videos to Notion",
        )
    except Exception as e:
        logger.exception("sync-videos failed")
        task_manager.update_task(task_id, status="failed", message=str(e))
    finally:
        db.close()
