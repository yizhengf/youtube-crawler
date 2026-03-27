from pathlib import Path


def format_srt_timestamp(seconds: float) -> str:
    millis = int(round(seconds * 1000))
    hours = millis // 3_600_000
    minutes = (millis % 3_600_000) // 60_000
    secs = (millis % 60_000) // 1_000
    ms = millis % 1_000
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{ms:03d}"


def write_srt(segments: list[dict], output_path: Path) -> dict:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    lines: list[str] = []
    for idx, segment in enumerate(segments, start=1):
        lines.extend(
            [
                str(idx),
                f"{format_srt_timestamp(segment['start'])} --> {format_srt_timestamp(segment['end'])}",
                segment["text"].strip(),
                "",
            ]
        )
    output_path.write_text("\n".join(lines), encoding="utf-8")
    return {"entries": len(segments)}


def build_segment_timeline(script_segments: list, total_duration: float) -> list[dict]:
    if not script_segments:
        return []

    weighted = []
    total_weight = 0
    for segment in script_segments:
        hint = getattr(segment, "duration_hint_seconds", None)
        weight = hint if hint and hint > 0 else max(3, len(segment.text.split()) / 2.5)
        total_weight += weight
        weighted.append((segment, weight))

    cursor = 0.0
    timed_segments = []
    for idx, (segment, weight) in enumerate(weighted):
        duration = total_duration * (weight / total_weight) if total_weight else 0
        start = cursor
        end = total_duration if idx == len(weighted) - 1 else cursor + duration
        cursor = end
        timed_segments.append(
            {
                "segment_index": getattr(segment, "segment_index", idx + 1),
                "text": segment.text,
                "start": round(start, 2),
                "end": round(end, 2),
            }
        )

    return timed_segments
