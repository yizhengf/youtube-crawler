from sqlalchemy import Column, Integer, Text, DateTime
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
