import shutil
import subprocess
from pathlib import Path
from typing import Optional


def ffmpeg_available() -> bool:
    return shutil.which("ffmpeg") is not None


def render_story_video(
    audio_path: Path,
    output_path: Path,
    duration_seconds: float,
    aspect_ratio: str = "9:16",
    subtitle_path: Optional[Path] = None,
):
    if not ffmpeg_available():
        raise RuntimeError("ffmpeg is not installed or not available in PATH")

    output_path.parent.mkdir(parents=True, exist_ok=True)

    dimensions = {
        "9:16": "1080x1920",
        "16:9": "1920x1080",
        "1:1": "1080x1080",
    }
    size = dimensions.get(aspect_ratio, "1080x1920")
    audio_filename = audio_path.name
    output_filename = output_path.name
    base_command = [
        "ffmpeg",
        "-y",
        "-f",
        "lavfi",
        "-i",
        f"color=c=0x111827:s={size}:r=30:d={max(duration_seconds, 1)}",
        "-i",
        audio_filename,
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        "-shortest",
    ]

    if subtitle_path:
        subtitle_filename = subtitle_path.name
        subtitle_command = [
            *base_command,
            "-vf",
            f"subtitles=filename={subtitle_filename}",
            output_filename,
        ]
        completed = subprocess.run(
            subtitle_command,
            capture_output=True,
            text=True,
            cwd=str(output_path.parent),
        )
        if completed.returncode == 0:
            return {"output_path": str(output_path), "subtitle_burned": True}

    render_command = [*base_command, output_filename]
    completed = subprocess.run(
        render_command,
        capture_output=True,
        text=True,
        cwd=str(output_path.parent),
    )
    if completed.returncode != 0:
        raise RuntimeError(completed.stderr.strip() or "ffmpeg render failed")

    result = {"output_path": str(output_path), "subtitle_burned": False}
    if subtitle_path:
        result["warning"] = "字幕 filter 不可用，已輸出無硬字幕版本並保留 .srt 檔。"
    return result
