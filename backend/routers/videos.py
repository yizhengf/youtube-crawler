import math
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, desc, asc
from sqlalchemy.orm import Session

from database import get_db
from models import Video
from schemas import VideoResponse, VideoPaginatedResponse, VideoStatsResponse

router = APIRouter(prefix="/api/videos", tags=["videos"])

SORT_COLUMNS = {
    "view_count": Video.view_count,
    "like_count": Video.like_count,
    "published_at": Video.published_at,
    "comment_count": Video.comment_count,
    "title": Video.title,
}


@router.get("", response_model=VideoPaginatedResponse)
def list_videos(
    channel_id: Optional[str] = Query(None),
    sort: str = Query("published_at"),
    order: str = Query("desc"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    q = db.query(Video)

    if channel_id:
        q = q.filter(Video.channel_id == channel_id)
    if search:
        q = q.filter(Video.title.ilike(f"%{search}%"))

    # Sorting
    sort_col = SORT_COLUMNS.get(sort, Video.published_at)
    order_fn = desc if order == "desc" else asc
    q = q.order_by(order_fn(sort_col))

    total = q.count()
    total_pages = math.ceil(total / page_size) if total > 0 else 1
    items = q.offset((page - 1) * page_size).limit(page_size).all()

    return VideoPaginatedResponse(
        items=[VideoResponse.model_validate(v) for v in items],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/stats", response_model=VideoStatsResponse)
def video_stats(
    channel_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    q = db.query(Video)
    if channel_id:
        q = q.filter(Video.channel_id == channel_id)

    total = q.count()
    crawled = q.filter(Video.status == "爬蟲完成").count()

    agg = (
        db.query(
            func.avg(Video.view_count),
            func.avg(Video.like_count),
            func.avg(Video.comment_count),
        )
        .filter(Video.status == "爬蟲完成")
    )
    if channel_id:
        agg = agg.filter(Video.channel_id == channel_id)
    row = agg.first()

    return VideoStatsResponse(
        total_videos=total,
        total_crawled=crawled,
        avg_view_count=round(row[0], 2) if row[0] else None,
        avg_like_count=round(row[1], 2) if row[1] else None,
        avg_comment_count=round(row[2], 2) if row[2] else None,
    )
