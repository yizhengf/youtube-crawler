from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


# ---------- Settings ----------

class SettingsUpdate(BaseModel):
    youtube_api_key: Optional[str] = None
    notion_token: Optional[str] = None
    notion_channels_db_id: Optional[str] = None
    notion_videos_db_id: Optional[str] = None
    openai_api_key: Optional[str] = None
    deepseek_api_key: Optional[str] = None
    fal_api_key: Optional[str] = None
    sora_api_key: Optional[str] = None
    hailuo_api_key: Optional[str] = None
    grok_api_key: Optional[str] = None


class SettingsResponse(BaseModel):
    youtube_api_key: Optional[str] = None
    notion_token: Optional[str] = None
    notion_channels_db_id: Optional[str] = None
    notion_videos_db_id: Optional[str] = None
    openai_api_key: Optional[str] = None
    deepseek_api_key: Optional[str] = None
    fal_api_key: Optional[str] = None
    sora_api_key: Optional[str] = None
    hailuo_api_key: Optional[str] = None
    grok_api_key: Optional[str] = None


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


class VideoDetailResponse(VideoResponse):
    channel_handle: Optional[str] = None


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


# ---------- Jobs ----------

class JobCreate(BaseModel):
    job_type: str
    title: str
    source_video_id: Optional[int] = None
    input_mode: Optional[str] = None
    topic: Optional[str] = None
    description: Optional[str] = None
    prompt: Optional[str] = None
    provider: Optional[str] = None
    aspect_ratio: Optional[str] = None
    image_urls: Optional[List[str]] = None
    language: Optional[str] = None
    tone: Optional[str] = None
    target_duration: Optional[int] = None
    review_required: bool = False


class JobActionResponse(BaseModel):
    job_id: int
    task_id: Optional[str] = None
    message: str


class JobScriptSegmentResponse(BaseModel):
    id: int
    segment_index: int
    text: str
    image_prompt: Optional[str] = None
    video_prompt: Optional[str] = None
    duration_hint_seconds: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class JobScriptResponse(BaseModel):
    id: int
    job_id: int
    script_type: str
    content: str
    version: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    segments: List[JobScriptSegmentResponse] = []

    class Config:
        from_attributes = True


class AssetResponse(BaseModel):
    id: int
    job_id: int
    asset_type: str
    provider: Optional[str] = None
    source_url: Optional[str] = None
    local_path: Optional[str] = None
    mime_type: Optional[str] = None
    status: str
    metadata_json: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class GenerationTaskResponse(BaseModel):
    id: int
    job_id: int
    task_type: str
    provider: Optional[str] = None
    external_task_id: Optional[str] = None
    status: str
    request_payload: Optional[str] = None
    response_payload: Optional[str] = None
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class JobResponse(BaseModel):
    id: int
    job_type: str
    title: str
    source_video_id: Optional[int] = None
    input_mode: Optional[str] = None
    topic: Optional[str] = None
    description: Optional[str] = None
    prompt: Optional[str] = None
    provider: Optional[str] = None
    aspect_ratio: Optional[str] = None
    image_urls: Optional[str] = None
    language: Optional[str] = None
    tone: Optional[str] = None
    target_duration: Optional[int] = None
    status: str
    review_status: str
    current_step: Optional[str] = None
    error_message: Optional[str] = None
    result_summary: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class JobDetailResponse(JobResponse):
    scripts: List[JobScriptResponse] = []
    assets: List[AssetResponse] = []
    generation_tasks: List[GenerationTaskResponse] = []
    source_video: Optional[VideoResponse] = None


# ---------- Analysis ----------

class AnalysisStatusResponse(BaseModel):
    status: str
    message: str


class AnalysisKeywordItem(BaseModel):
    keyword: str
    count: int


class AnalysisTopVideoItem(BaseModel):
    id: int
    video_id: str
    title: Optional[str] = None
    url: Optional[str] = None
    view_count: Optional[int] = None
    like_count: Optional[int] = None
    published_at: Optional[datetime] = None
    channel_id: str


class AnalysisChannelSummary(BaseModel):
    id: int
    handle: Optional[str] = None
    url: str
    channel_id: Optional[str] = None
    video_count: int
    avg_view_count: Optional[float] = None
    avg_like_count: Optional[float] = None
    top_video_title: Optional[str] = None
    top_video_views: Optional[int] = None


class AnalysisTitlePatternResponse(BaseModel):
    avg_title_length: float
    question_title_ratio: float
    digit_title_ratio: float
    top_keywords: List[AnalysisKeywordItem] = []


class AnalysisOverviewResponse(BaseModel):
    status: str
    selected_channel_id: Optional[str] = None
    total_channels: int
    total_videos: int
    avg_view_count: Optional[float] = None
    avg_like_count: Optional[float] = None
    top_video_title: Optional[str] = None
    top_video_views: Optional[int] = None
    top_channels: List[AnalysisChannelSummary] = []
    top_videos: List[AnalysisTopVideoItem] = []
    title_patterns: AnalysisTitlePatternResponse
    recommendations: List[str] = []
