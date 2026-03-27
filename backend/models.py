from sqlalchemy import Column, Integer, Text, DateTime, ForeignKey
from sqlalchemy.sql import func

from database import Base


class Channel(Base):
    __tablename__ = "channels"

    id = Column(Integer, primary_key=True, autoincrement=True)
    url = Column(Text, nullable=False)
    handle = Column(Text, nullable=True)
    channel_id = Column(Text, nullable=True)
    type_of_video = Column(Text, nullable=True)
    status = Column(Text, nullable=False, default="準備拿取頻道ID")
    notion_page_id = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class Video(Base):
    __tablename__ = "videos"

    id = Column(Integer, primary_key=True, autoincrement=True)
    channel_id = Column(Text, nullable=False, index=True)
    video_id = Column(Text, unique=True, nullable=False)
    title = Column(Text, nullable=True)
    url = Column(Text, nullable=True)
    thumbnail = Column(Text, nullable=True)
    published_at = Column(DateTime, nullable=True)
    view_count = Column(Integer, nullable=True)
    like_count = Column(Integer, nullable=True)
    comment_count = Column(Integer, nullable=True)
    tags = Column(Text, nullable=True)
    description = Column(Text, nullable=True)
    duration = Column(Text, nullable=True)
    type_of_video = Column(Text, nullable=True)
    status = Column(Text, nullable=False, default="準備爬蟲")
    notion_page_id = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class Setting(Base):
    __tablename__ = "settings"

    key = Column(Text, primary_key=True)
    value = Column(Text, nullable=False)


class Job(Base):
    __tablename__ = "jobs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    job_type = Column(Text, nullable=False, index=True)
    title = Column(Text, nullable=False)
    source_video_id = Column(Integer, ForeignKey("videos.id"), nullable=True)
    input_mode = Column(Text, nullable=True)
    topic = Column(Text, nullable=True)
    description = Column(Text, nullable=True)
    prompt = Column(Text, nullable=True)
    provider = Column(Text, nullable=True)
    aspect_ratio = Column(Text, nullable=True)
    image_urls = Column(Text, nullable=True)
    language = Column(Text, nullable=True)
    tone = Column(Text, nullable=True)
    target_duration = Column(Integer, nullable=True)
    status = Column(Text, nullable=False, default="draft")
    review_status = Column(Text, nullable=False, default="not_required")
    current_step = Column(Text, nullable=True)
    error_message = Column(Text, nullable=True)
    result_summary = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class JobScript(Base):
    __tablename__ = "job_scripts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    job_id = Column(Integer, ForeignKey("jobs.id"), nullable=False, index=True)
    script_type = Column(Text, nullable=False, index=True)
    content = Column(Text, nullable=False)
    version = Column(Integer, nullable=False, default=1)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class JobScriptSegment(Base):
    __tablename__ = "job_script_segments"

    id = Column(Integer, primary_key=True, autoincrement=True)
    job_script_id = Column(Integer, ForeignKey("job_scripts.id"), nullable=False, index=True)
    segment_index = Column(Integer, nullable=False)
    text = Column(Text, nullable=False)
    image_prompt = Column(Text, nullable=True)
    video_prompt = Column(Text, nullable=True)
    duration_hint_seconds = Column(Integer, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class Asset(Base):
    __tablename__ = "assets"

    id = Column(Integer, primary_key=True, autoincrement=True)
    job_id = Column(Integer, ForeignKey("jobs.id"), nullable=False, index=True)
    asset_type = Column(Text, nullable=False)
    provider = Column(Text, nullable=True)
    source_url = Column(Text, nullable=True)
    local_path = Column(Text, nullable=True)
    mime_type = Column(Text, nullable=True)
    status = Column(Text, nullable=False, default="ready")
    metadata_json = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class GenerationTask(Base):
    __tablename__ = "generation_tasks"

    id = Column(Integer, primary_key=True, autoincrement=True)
    job_id = Column(Integer, ForeignKey("jobs.id"), nullable=False, index=True)
    task_type = Column(Text, nullable=False)
    provider = Column(Text, nullable=True)
    external_task_id = Column(Text, nullable=True)
    status = Column(Text, nullable=False, default="queued")
    request_payload = Column(Text, nullable=True)
    response_payload = Column(Text, nullable=True)
    started_at = Column(DateTime, nullable=True)
    finished_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class AnalysisReport(Base):
    __tablename__ = "analysis_reports"

    id = Column(Integer, primary_key=True, autoincrement=True)
    report_type = Column(Text, nullable=False)
    source_channel_id = Column(Integer, ForeignKey("channels.id"), nullable=True)
    source_video_id = Column(Integer, ForeignKey("videos.id"), nullable=True)
    status = Column(Text, nullable=False, default="planned")
    summary = Column(Text, nullable=True)
    raw_output = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
