from collections import Counter
import re
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc

from database import get_db
from models import Channel, Video
from schemas import (
    AnalysisChannelSummary,
    AnalysisKeywordItem,
    AnalysisOverviewResponse,
    AnalysisStatusResponse,
    AnalysisTitlePatternResponse,
    AnalysisTopVideoItem,
)

router = APIRouter(prefix="/api/analysis", tags=["analysis"])

STOPWORDS = {
    "the",
    "and",
    "for",
    "with",
    "from",
    "that",
    "this",
    "your",
    "about",
    "into",
    "shorts",
    "youtube",
    "video",
    "故事",
    "影片",
    "一個",
    "這個",
    "如果",
    "真的",
    "不是",
    "可以",
    "就是",
    "我們",
}


@router.get("/status", response_model=AnalysisStatusResponse)
def analysis_status():
    return AnalysisStatusResponse(
        status="available",
        message="第一版 AI 分析已啟用，支援頻道概覽、爆款排行、標題規律與內容建議。",
    )


@router.get("/overview", response_model=AnalysisOverviewResponse)
def analysis_overview(
    channel_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    video_query = db.query(Video)
    if channel_id:
        video_query = video_query.filter(Video.channel_id == channel_id)
    videos = video_query.order_by(desc(Video.view_count), desc(Video.published_at)).all()

    channel_query = db.query(Channel)
    if channel_id:
        channel_query = channel_query.filter(Channel.channel_id == channel_id)
    selected_channels = channel_query.order_by(Channel.created_at.desc()).all()
    all_channel_count = db.query(Channel).count()

    avg_view = _avg([video.view_count for video in videos if video.view_count is not None])
    avg_like = _avg([video.like_count for video in videos if video.like_count is not None])
    top_video = videos[0] if videos else None

    top_channels = _build_channel_summaries(db, selected_channels if channel_id else db.query(Channel).all())
    top_videos = [
        AnalysisTopVideoItem(
            id=video.id,
            video_id=video.video_id,
            title=video.title,
            url=video.url,
            view_count=video.view_count,
            like_count=video.like_count,
            published_at=video.published_at,
            channel_id=video.channel_id,
        )
        for video in videos[:5]
    ]
    title_patterns = _build_title_patterns(videos)
    recommendations = _build_recommendations(
        total_videos=len(videos),
        avg_view_count=avg_view,
        top_videos=top_videos,
        title_patterns=title_patterns,
        top_channels=top_channels,
        selected_channel_id=channel_id,
    )

    return AnalysisOverviewResponse(
        status="ready",
        selected_channel_id=channel_id,
        total_channels=len(selected_channels) if channel_id else all_channel_count,
        total_videos=len(videos),
        avg_view_count=avg_view,
        avg_like_count=avg_like,
        top_video_title=top_video.title if top_video else None,
        top_video_views=top_video.view_count if top_video else None,
        top_channels=top_channels,
        top_videos=top_videos,
        title_patterns=title_patterns,
        recommendations=recommendations,
    )


def _avg(values: list[int]) -> Optional[float]:
    if not values:
        return None
    return round(sum(values) / len(values), 2)


def _build_channel_summaries(db: Session, channels: list[Channel]) -> list[AnalysisChannelSummary]:
    summaries: list[AnalysisChannelSummary] = []
    for channel in channels:
        channel_videos = (
            db.query(Video)
            .filter(Video.channel_id == channel.channel_id)
            .order_by(desc(Video.view_count), desc(Video.published_at))
            .all()
        )
        avg_view = _avg([video.view_count for video in channel_videos if video.view_count is not None])
        avg_like = _avg([video.like_count for video in channel_videos if video.like_count is not None])
        top_video = channel_videos[0] if channel_videos else None
        summaries.append(
            AnalysisChannelSummary(
                id=channel.id,
                handle=channel.handle,
                url=channel.url,
                channel_id=channel.channel_id,
                video_count=len(channel_videos),
                avg_view_count=avg_view,
                avg_like_count=avg_like,
                top_video_title=top_video.title if top_video else None,
                top_video_views=top_video.view_count if top_video else None,
            )
        )
    summaries.sort(
        key=lambda item: (item.avg_view_count or 0, item.top_video_views or 0, item.video_count),
        reverse=True,
    )
    return summaries[:5]


def _build_title_patterns(videos: list[Video]) -> AnalysisTitlePatternResponse:
    titles = [video.title.strip() for video in videos if video.title and video.title.strip()]
    avg_length = round(sum(len(title) for title in titles) / len(titles), 2) if titles else 0.0
    question_ratio = round(
        sum(1 for title in titles if "?" in title or "？" in title) / len(titles), 2
    ) if titles else 0.0
    digit_ratio = round(
        sum(1 for title in titles if any(char.isdigit() for char in title)) / len(titles), 2
    ) if titles else 0.0

    counter: Counter[str] = Counter()
    for title in titles:
        for token in _tokenize_title(title):
            if token not in STOPWORDS and len(token) >= 2:
                counter[token] += 1

    return AnalysisTitlePatternResponse(
        avg_title_length=avg_length,
        question_title_ratio=question_ratio,
        digit_title_ratio=digit_ratio,
        top_keywords=[
            AnalysisKeywordItem(keyword=word, count=count)
            for word, count in counter.most_common(8)
        ],
    )


def _tokenize_title(title: str) -> list[str]:
    normalized = re.sub(r"[^\w\u4e00-\u9fff]+", " ", title.lower())
    tokens = [token.strip() for token in normalized.split() if token.strip()]
    expanded: list[str] = []
    for token in tokens:
        if re.fullmatch(r"[\u4e00-\u9fff]{2,}", token):
            expanded.extend(token[i : i + 2] for i in range(0, len(token) - 1))
        else:
            expanded.append(token)
    return expanded


def _build_recommendations(
    total_videos: int,
    avg_view_count: Optional[float],
    top_videos: list[AnalysisTopVideoItem],
    title_patterns: AnalysisTitlePatternResponse,
    top_channels: list[AnalysisChannelSummary],
    selected_channel_id: Optional[str],
) -> list[str]:
    recommendations: list[str] = []
    if total_videos < 10:
        recommendations.append("目前樣本數偏少，建議先把頻道影片爬到至少 10 支，再判斷內容公式。")
    if title_patterns.question_title_ratio >= 0.3:
        recommendations.append("高表現標題常用提問句，可多測試「為什麼 / 怎麼會 / 你敢嗎」這類開頭。")
    if title_patterns.digit_title_ratio >= 0.3:
        recommendations.append("標題常出現數字或清單格式，可優先測試「3 個反轉」「5 秒看懂」這類結構。")
    if top_videos:
        recommendations.append(
            f"先優先仿寫觀看最高的主題：<{top_videos[0].title or top_videos[0].video_id}>，它是目前最明確的爆款樣本。"
        )
    if avg_view_count is not None and avg_view_count < 10000:
        recommendations.append("平均觀看數還不高，建議先聚焦單一題材與固定節奏，不要同時測太多影片形式。")
    if not selected_channel_id and len(top_channels) > 1:
        recommendations.append("先挑平均觀看數最高的 1 到 2 個頻道做對標，比同時分析太多頻道更容易得出策略。")
    if not recommendations:
        recommendations.append("目前資料分布穩定，可以開始把爆款關鍵詞與高表現題材轉成仿寫任務。")
    return recommendations[:5]
