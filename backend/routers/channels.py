from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import get_db
from models import Channel, Video
from schemas import ChannelCreate, ChannelUpdate, ChannelResponse
from services.youtube import extract_handle_from_url

router = APIRouter(prefix="/api/channels", tags=["channels"])


@router.get("", response_model=List[ChannelResponse])
def list_channels(db: Session = Depends(get_db)):
    # Subquery for video count
    video_counts = (
        db.query(
            Video.channel_id,
            func.count(Video.id).label("video_count"),
        )
        .group_by(Video.channel_id)
        .subquery()
    )

    rows = (
        db.query(Channel, video_counts.c.video_count)
        .outerjoin(video_counts, Channel.channel_id == video_counts.c.channel_id)
        .order_by(Channel.created_at.desc())
        .all()
    )

    results = []
    for ch, count in rows:
        resp = ChannelResponse.model_validate(ch)
        resp.video_count = count or 0
        results.append(resp)
    return results


@router.post("", response_model=ChannelResponse, status_code=201)
def create_channel(body: ChannelCreate, db: Session = Depends(get_db)):
    handle = extract_handle_from_url(body.url)
    channel = Channel(
        url=body.url,
        handle=handle,
        type_of_video=body.type_of_video,
        status="準備拿取頻道ID",
    )
    db.add(channel)
    db.commit()
    db.refresh(channel)
    resp = ChannelResponse.model_validate(channel)
    resp.video_count = 0
    return resp


@router.put("/{channel_id}", response_model=ChannelResponse)
def update_channel(channel_id: int, body: ChannelUpdate, db: Session = Depends(get_db)):
    channel = db.query(Channel).filter(Channel.id == channel_id).first()
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")
    if body.type_of_video is not None:
        channel.type_of_video = body.type_of_video
    db.commit()
    db.refresh(channel)
    video_count = (
        db.query(func.count(Video.id))
        .filter(Video.channel_id == channel.channel_id)
        .scalar()
    ) or 0
    resp = ChannelResponse.model_validate(channel)
    resp.video_count = video_count
    return resp


@router.delete("/{channel_id}", status_code=204)
def delete_channel(channel_id: int, db: Session = Depends(get_db)):
    channel = db.query(Channel).filter(Channel.id == channel_id).first()
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")
    # Delete associated videos
    if channel.channel_id:
        db.query(Video).filter(Video.channel_id == channel.channel_id).delete()
    db.delete(channel)
    db.commit()
    return None
