from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent.parent
GENERATED_DIR = BASE_DIR / "generated"


def ensure_generated_root() -> Path:
    GENERATED_DIR.mkdir(parents=True, exist_ok=True)
    return GENERATED_DIR


def get_job_asset_dir(job_id: int) -> Path:
    root = ensure_generated_root()
    job_dir = root / f"job_{job_id}"
    job_dir.mkdir(parents=True, exist_ok=True)
    return job_dir


def get_asset_web_path(job_id: int, filename: str) -> str:
    return f"/generated/job_{job_id}/{filename}"
