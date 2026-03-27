"""Notion API integration using httpx (no SDK)."""

from typing import Any, Dict, Iterable, Optional

import httpx

NOTION_API_BASE = "https://api.notion.com/v1"
NOTION_VERSION = "2022-06-28"


def _headers(token: str) -> dict:
    return {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "Notion-Version": NOTION_VERSION,
    }


def _rich_text(text: Optional[str]) -> list:
    if not text:
        return []
    truncated = text[:2000] if len(text) > 2000 else text
    return [{"type": "text", "text": {"content": truncated}}]


async def _ensure_success(resp: httpx.Response, context: str) -> None:
    if resp.is_success:
        return
    body = resp.text
    raise httpx.HTTPStatusError(
        f"{context} failed: {resp.status_code} {body}",
        request=resp.request,
        response=resp,
    )


async def _get_database_schema(client: httpx.AsyncClient, token: str, db_id: str) -> Dict[str, Any]:
    resp = await client.get(
        f"{NOTION_API_BASE}/databases/{db_id}",
        headers=_headers(token),
    )
    await _ensure_success(resp, "Notion read database schema")
    return resp.json()


def _find_title_property_name(schema: Dict[str, Any]) -> str:
    for name, definition in schema.get("properties", {}).items():
        if definition.get("type") == "title":
            return name
    raise ValueError("Notion database does not contain a title property.")


def _resolve_property_name(
    schema: Dict[str, Any],
    aliases: Iterable[str],
    expected_types: Iterable[str],
) -> Optional[str]:
    properties = schema.get("properties", {})
    expected = set(expected_types)

    for alias in aliases:
        definition = properties.get(alias)
        if definition and definition.get("type") in expected:
            return alias
    return None


def _set_property(
    output: Dict[str, Any],
    schema: Dict[str, Any],
    aliases: Iterable[str],
    expected_types: Iterable[str],
    payload: Optional[Dict[str, Any]],
) -> None:
    if not payload:
        return

    property_name = _resolve_property_name(schema, aliases, expected_types)
    if property_name:
        output[property_name] = payload


def _channel_properties(channel: Any, schema: Dict[str, Any]) -> Dict[str, Any]:
    properties: Dict[str, Any] = {}
    title_property = _find_title_property_name(schema)
    properties[title_property] = {"title": _rich_text(channel.handle or channel.url)}

    _set_property(properties, schema, ["URL", "YouTube Channel URL"], ["url"], {"url": channel.url})
    _set_property(
        properties,
        schema,
        ["Handle"],
        ["rich_text"],
        {"rich_text": _rich_text(channel.handle)},
    )
    _set_property(
        properties,
        schema,
        ["Channel ID"],
        ["rich_text"],
        {"rich_text": _rich_text(channel.channel_id)},
    )
    _set_property(
        properties,
        schema,
        ["Status"],
        ["select"],
        {"select": {"name": channel.status}},
    )

    if channel.type_of_video:
        _set_property(
            properties,
            schema,
            ["Type", "Type of Video"],
            ["select"],
            {"select": {"name": channel.type_of_video}},
        )

    return properties


def _video_properties(video: Any, schema: Dict[str, Any]) -> Dict[str, Any]:
    properties: Dict[str, Any] = {}
    title_property = _find_title_property_name(schema)
    properties[title_property] = {"title": _rich_text(video.title or video.video_id)}

    _set_property(
        properties,
        schema,
        ["Video ID"],
        ["rich_text"],
        {"rich_text": _rich_text(video.video_id)},
    )
    _set_property(
        properties,
        schema,
        ["URL", "YouTube Video URL"],
        ["url"],
        {"url": video.url},
    )
    _set_property(
        properties,
        schema,
        ["Channel ID"],
        ["rich_text"],
        {"rich_text": _rich_text(video.channel_id)},
    )
    _set_property(
        properties,
        schema,
        ["Status"],
        ["select"],
        {"select": {"name": video.status}},
    )

    if video.view_count is not None:
        _set_property(
            properties,
            schema,
            ["Views", "View Count"],
            ["number"],
            {"number": video.view_count},
        )
    if video.like_count is not None:
        _set_property(
            properties,
            schema,
            ["Likes", "Like Count"],
            ["number"],
            {"number": video.like_count},
        )
    if video.comment_count is not None:
        _set_property(
            properties,
            schema,
            ["Comments", "Comment Count"],
            ["number"],
            {"number": video.comment_count},
        )
    if video.duration:
        _set_property(
            properties,
            schema,
            ["Duration"],
            ["rich_text"],
            {"rich_text": _rich_text(video.duration)},
        )
    if video.type_of_video:
        _set_property(
            properties,
            schema,
            ["Type", "Type of Video"],
            ["select"],
            {"select": {"name": video.type_of_video}},
        )
    if video.published_at:
        _set_property(
            properties,
            schema,
            ["Published At"],
            ["date"],
            {"date": {"start": video.published_at.isoformat()}},
        )
    if video.thumbnail:
        _set_property(
            properties,
            schema,
            ["Thumbnail"],
            ["url"],
            {"url": video.thumbnail},
        )
    if video.tags:
        _set_property(
            properties,
            schema,
            ["Tags"],
            ["rich_text"],
            {"rich_text": _rich_text(video.tags)},
        )
    if video.description:
        _set_property(
            properties,
            schema,
            ["Description"],
            ["rich_text"],
            {"rich_text": _rich_text(video.description)},
        )

    return properties


async def sync_channel_to_notion(channel, token: str, db_id: str) -> str:
    async with httpx.AsyncClient(timeout=30) as client:
        schema = await _get_database_schema(client, token, db_id)
        properties = _channel_properties(channel, schema)

        if channel.notion_page_id:
            resp = await client.patch(
                f"{NOTION_API_BASE}/pages/{channel.notion_page_id}",
                headers=_headers(token),
                json={"properties": properties},
            )
            await _ensure_success(resp, "Notion update channel page")
            return channel.notion_page_id

        resp = await client.post(
            f"{NOTION_API_BASE}/pages",
            headers=_headers(token),
            json={
                "parent": {"database_id": db_id},
                "properties": properties,
            },
        )
        await _ensure_success(resp, "Notion create channel page")
        data = resp.json()
        return data["id"]


async def sync_video_to_notion(video, token: str, db_id: str) -> str:
    async with httpx.AsyncClient(timeout=30) as client:
        schema = await _get_database_schema(client, token, db_id)
        properties = _video_properties(video, schema)

        if video.notion_page_id:
            resp = await client.patch(
                f"{NOTION_API_BASE}/pages/{video.notion_page_id}",
                headers=_headers(token),
                json={"properties": properties},
            )
            await _ensure_success(resp, "Notion update video page")
            return video.notion_page_id

        resp = await client.post(
            f"{NOTION_API_BASE}/pages",
            headers=_headers(token),
            json={
                "parent": {"database_id": db_id},
                "properties": properties,
            },
        )
        await _ensure_success(resp, "Notion create video page")
        data = resp.json()
        return data["id"]
