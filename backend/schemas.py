from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


# ---------- Settings ----------

class SettingsUpdate(BaseModel):
    youtube_api_key: Optional[str] = None
    notion_token: Optional[str] = None
    notion_channels_db_id: Optional[str] = None
    notion_videos_db_id: Optional[str] = None


class SettingsResponse(BaseModel):
    youtube_api_key: Optional[str] = None
    notion_token: Optional[str] = None
    notion_channels_db_id: Optional[str] = None
    notion_videos_db_id: Optional[str] = None


# ---------- Channels ----------

class ChannelCreate(BaseModel):
    url: str
    type_of_video: Optional[str] = None


class ChannelUpdate(BaseModel):
    type_of_video: Optional[str] = None


class ChannelResponse(BaseModel):
    id: int
    url: str
    handle: Optional[str] = None
    channel_id: Optional[str] = None
    type_of_video: Optional[str] = None
    status: str
    notion_page_id: Optional[str] = None
    video_count: Optional[int] = 0
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ---------- Videos ----------

class VideoResponse(BaseModel):
    id: int
    channel_id: str
    video_id: str
    title: Optional[str] = None
    url: Optional[str] = None
    thumbnail: Optional[str] = None
    published_at: Optional[datetime] = None
    view_count: Optional[int] = None
    like_count: Optional[int] = None
    comment_count: Optional[int] = None
    tags: Optional[str] = None
    description: Optional[str] = None
    duration: Optional[str] = None
    type_of_video: Optional[str] = None
    status: str
    notion_page_id: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class VideoPaginatedResponse(BaseModel):
    items: List[VideoResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class VideoStatsResponse(BaseModel):
    total_videos: int
    total_crawled: int
    avg_view_count: Optional[float] = None
    avg_like_count: Optional[float] = None
    avg_comment_count: Optional[float] = None


# ---------- Tasks ----------

class TaskResponse(BaseModel):
    task_id: str
    type: str
    status: str
    progress_current: int
    progress_total: int
    message: str
    created_at: datetime
