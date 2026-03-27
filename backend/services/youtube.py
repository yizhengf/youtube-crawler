import re
from typing import List, Optional
from urllib.parse import urlparse

import httpx

YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3"


def extract_handle_from_url(url: str) -> Optional[str]:
    """Extract @handle from various YouTube channel URL formats."""
    url = url.strip().rstrip("/")

    # Match /@handle
    m = re.search(r"/@([^/?&#]+)", url)
    if m:
        return f"@{m.group(1)}"

    # Match /c/CustomName or /user/Username or /channel/UCxxxx
    m = re.search(r"/(c|user|channel)/([^/?&#]+)", url)
    if m:
        return m.group(2)

    # Bare handle like @something passed directly
    if url.startswith("@"):
        return url

    return None


async def resolve_channel_id(url_or_handle: str, api_key: str) -> str:
    """
    Resolve a YouTube channel URL or @handle to a Channel ID (UC...).

    Tries multiple strategies:
    1. If URL contains /channel/UC..., extract directly.
    2. Use YouTube search or channels API with forHandle.
    """
    url_or_handle = url_or_handle.strip().rstrip("/")

    # Direct channel ID from URL
    m = re.search(r"/channel/(UC[A-Za-z0-9_-]+)", url_or_handle)
    if m:
        return m.group(1)

    handle = extract_handle_from_url(url_or_handle)
    if not handle:
        handle = url_or_handle

    # Remove @ prefix for forHandle param
    handle_clean = handle.lstrip("@")

    async with httpx.AsyncClient(timeout=30) as client:
        # Strategy 1: channels?forHandle=
        resp = await client.get(
            f"{YOUTUBE_API_BASE}/channels",
            params={
                "part": "id",
                "forHandle": handle_clean,
                "key": api_key,
            },
        )
        resp.raise_for_status()
        data = resp.json()
        items = data.get("items", [])
        if items:
            return items[0]["id"]

        # Strategy 2: search for the channel
        resp = await client.get(
            f"{YOUTUBE_API_BASE}/search",
            params={
                "part": "snippet",
                "q": handle_clean,
                "type": "channel",
                "maxResults": 1,
                "key": api_key,
            },
        )
        resp.raise_for_status()
        data = resp.json()
        items = data.get("items", [])
        if items:
            return items[0]["snippet"]["channelId"]

    raise ValueError(f"Could not resolve channel ID for: {url_or_handle}")


async def search_channel_videos(channel_id: str, api_key: str) -> List[dict]:
    """
    Crawl all video IDs + basic snippet info from a channel using the
    search endpoint with full nextPageToken pagination.
    """
    videos = []
    next_page_token = None

    async with httpx.AsyncClient(timeout=60) as client:
        while True:
            params = {
                "part": "snippet",
                "channelId": channel_id,
                "type": "video",
                "maxResults": 50,
                "order": "date",
                "key": api_key,
            }
            if next_page_token:
                params["pageToken"] = next_page_token

            resp = await client.get(f"{YOUTUBE_API_BASE}/search", params=params)
            resp.raise_for_status()
            data = resp.json()

            for item in data.get("items", []):
                vid_id = item.get("id", {}).get("videoId")
                if not vid_id:
                    continue
                snippet = item.get("snippet", {})
                videos.append(
                    {
                        "video_id": vid_id,
                        "title": snippet.get("title"),
                        "published_at": snippet.get("publishedAt"),
                        "thumbnail": (
                            snippet.get("thumbnails", {})
                            .get("high", {})
                            .get("url")
                        ),
                    }
                )

            next_page_token = data.get("nextPageToken")
            if not next_page_token:
                break

    return videos


async def get_video_details(video_ids: List[str], api_key: str) -> List[dict]:
    """
    Fetch full details for a list of video IDs.
    Batches into groups of 50 (YouTube API limit).
    """
    all_details = []

    async with httpx.AsyncClient(timeout=60) as client:
        for i in range(0, len(video_ids), 50):
            batch = video_ids[i : i + 50]
            resp = await client.get(
                f"{YOUTUBE_API_BASE}/videos",
                params={
                    "part": "snippet,statistics,contentDetails",
                    "id": ",".join(batch),
                    "key": api_key,
                },
            )
            resp.raise_for_status()
            data = resp.json()

            for item in data.get("items", []):
                vid_id = item["id"]
                snippet = item.get("snippet", {})
                stats = item.get("statistics", {})
                content = item.get("contentDetails", {})

                all_details.append(
                    {
                        "video_id": vid_id,
                        "title": snippet.get("title"),
                        "description": snippet.get("description"),
                        "published_at": snippet.get("publishedAt"),
                        "tags": snippet.get("tags"),  # list or None
                        "thumbnail": (
                            snippet.get("thumbnails", {})
                            .get("high", {})
                            .get("url")
                        ),
                        "view_count": _safe_int(stats.get("viewCount")),
                        "like_count": _safe_int(stats.get("likeCount")),
                        "comment_count": _safe_int(stats.get("commentCount")),
                        "duration": content.get("duration"),
                    }
                )

    return all_details


def _safe_int(val) -> Optional[int]:
    if val is None:
        return None
    try:
        return int(val)
    except (ValueError, TypeError):
        return None
