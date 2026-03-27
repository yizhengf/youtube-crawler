import math
import struct
import wave
from pathlib import Path
from typing import Optional
from urllib.parse import urlparse

import httpx


OPENAI_TTS_ENDPOINT = "https://api.openai.com/v1/audio/speech"
FAL_TTS_MODEL_ID = "fal-ai/minimax/speech-2.8-hd"
FAL_SYNC_ENDPOINT = f"https://fal.run/{FAL_TTS_MODEL_ID}"


def estimate_duration_seconds(text: str) -> float:
    words = max(1, len(text.split()))
    seconds = max(4.0, words / 2.8)
    return round(seconds, 2)


def audio_duration_seconds(path: Path) -> float:
    if path.suffix.lower() == ".wav":
        with wave.open(str(path), "rb") as wav_file:
            frames = wav_file.getnframes()
            frame_rate = wav_file.getframerate() or 1
            return round(frames / float(frame_rate), 2)
    return round(max(path.stat().st_size / 32000.0, 1.0), 2)


async def synthesize_to_audio(
    text: str,
    output_path: Path,
    fal_api_key: Optional[str] = None,
    openai_api_key: Optional[str] = None,
) -> dict:
    output_path.parent.mkdir(parents=True, exist_ok=True)

    if fal_api_key:
        try:
            fal_result = await _fal_tts_to_audio(text, output_path, fal_api_key)
            fal_result["duration_seconds"] = fal_result.get("duration_seconds") or audio_duration_seconds(
                Path(fal_result["output_path"])
            )
            return fal_result
        except Exception as exc:
            if openai_api_key:
                openai_result = await _openai_result(text, output_path, openai_api_key)
                openai_result["fallback_reason"] = f"fal.ai failed: {exc}"
                return openai_result

            duration = estimate_duration_seconds(text)
            _generate_placeholder_tone(output_path, duration)
            return {
                "provider": "placeholder",
                "duration_seconds": duration,
                "output_path": str(output_path),
                "file_ext": output_path.suffix.lower() or ".wav",
                "mime_type": "audio/wav",
                "fallback_reason": f"fal.ai failed: {exc}",
            }

    if openai_api_key:
        return await _openai_result(text, output_path, openai_api_key)

    duration = estimate_duration_seconds(text)
    _generate_placeholder_tone(output_path, duration)
    return {
        "provider": "placeholder",
        "duration_seconds": duration,
        "output_path": str(output_path),
        "file_ext": output_path.suffix.lower() or ".wav",
        "mime_type": "audio/wav",
    }


async def _openai_result(text: str, output_path: Path, api_key: str) -> dict:
    await _openai_tts_to_wav(text, output_path, api_key)
    return {
        "provider": "openai",
        "duration_seconds": audio_duration_seconds(output_path),
        "output_path": str(output_path),
        "file_ext": output_path.suffix.lower() or ".wav",
        "mime_type": "audio/wav",
    }


async def _openai_tts_to_wav(text: str, output_path: Path, api_key: str):
    payload = {
        "model": "gpt-4o-mini-tts",
        "voice": "coral",
        "input": text[:4096],
        "format": "wav",
    }
    headers = {"Authorization": f"Bearer {api_key}"}

    async with httpx.AsyncClient(timeout=120) as client:
        response = await client.post(
            OPENAI_TTS_ENDPOINT,
            headers=headers,
            json=payload,
        )
        response.raise_for_status()
        output_path.write_bytes(response.content)


async def _fal_tts_to_audio(text: str, output_path: Path, api_key: str) -> dict:
    payload = {
        "prompt": text[:5000],
        "output_format": "url",
        "audio_setting": {
            "format": "mp3",
            "sample_rate": 32000,
            "bitrate": 128000,
            "channel": 1,
        },
    }
    if _contains_cjk(text):
        payload["language_boost"] = "Chinese"

    headers = {
        "Authorization": f"Key {api_key}",
        "Content-Type": "application/json",
    }

    async with httpx.AsyncClient(timeout=180) as client:
        response = await client.post(FAL_SYNC_ENDPOINT, headers=headers, json=payload)
        response.raise_for_status()
        data = response.json()
        audio_info = data.get("audio") or {}
        audio_url = audio_info.get("url")
        if not audio_url:
            raise RuntimeError("fal.ai TTS response missing audio url")

        extension = _extension_from_url(audio_url) or ".mp3"
        final_output_path = output_path.with_suffix(extension)

        download = await client.get(audio_url)
        download.raise_for_status()
        final_output_path.write_bytes(download.content)

    return {
        "provider": "fal",
        "model": FAL_TTS_MODEL_ID,
        "duration_seconds": round((data.get("duration_ms") or 0) / 1000, 2) if data.get("duration_ms") else None,
        "output_path": str(final_output_path),
        "file_ext": extension,
        "mime_type": _mime_type_for_extension(extension),
        "audio_url": audio_url,
    }


def _extension_from_url(url: str) -> str:
    parsed = urlparse(url)
    suffix = Path(parsed.path).suffix.lower()
    return suffix if suffix in {".mp3", ".wav", ".flac", ".pcm"} else ""


def _mime_type_for_extension(extension: str) -> str:
    mapping = {
        ".wav": "audio/wav",
        ".mp3": "audio/mpeg",
        ".flac": "audio/flac",
        ".pcm": "audio/L16",
    }
    return mapping.get(extension.lower(), "application/octet-stream")


def _contains_cjk(text: str) -> bool:
    return any("\u4e00" <= char <= "\u9fff" for char in text)


def _generate_placeholder_tone(output_path: Path, duration_seconds: float):
    sample_rate = 22050
    amplitude = 2000
    frequency = 440.0
    total_frames = int(sample_rate * duration_seconds)

    with wave.open(str(output_path), "w") as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(sample_rate)

        frames = bytearray()
        for frame_idx in range(total_frames):
            envelope = 0.3 if frame_idx < total_frames - sample_rate * 0.2 else 0.15
            sample = int(
                amplitude
                * envelope
                * math.sin(2 * math.pi * frequency * (frame_idx / sample_rate))
            )
            frames.extend(struct.pack("<h", sample))

        wav_file.writeframes(bytes(frames))
