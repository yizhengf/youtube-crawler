from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import Optional

from database import get_db
from models import Setting
from schemas import SettingsUpdate, SettingsResponse

router = APIRouter(prefix="/api/settings", tags=["settings"])

SETTING_KEYS = [
    "youtube_api_key",
    "notion_token",
    "notion_channels_db_id",
    "notion_videos_db_id",
]


def _mask(value: Optional[str]) -> Optional[str]:
    if not value:
        return None
    if len(value) <= 4:
        return "****"
    return "*" * (len(value) - 4) + value[-4:]


def _looks_masked(value: Optional[str]) -> bool:
    if not value:
        return False
    return set(value) <= {"*"} or (
        "*" in value and len(value) >= 4 and value.rstrip("*") != value
    )


def get_setting(db: Session, key: str) -> Optional[str]:
    row = db.query(Setting).filter(Setting.key == key).first()
    return row.value if row else None


@router.get("", response_model=SettingsResponse)
def read_settings(db: Session = Depends(get_db)):
    result = {}
    for key in SETTING_KEYS:
        result[key] = _mask(get_setting(db, key))
    return result


@router.put("", response_model=SettingsResponse)
def update_settings(body: SettingsUpdate, db: Session = Depends(get_db)):
    updates = body.model_dump(exclude_none=True)
    for key, value in updates.items():
        if _looks_masked(value):
            continue
        existing = db.query(Setting).filter(Setting.key == key).first()
        if existing:
            existing.value = value
        else:
            db.add(Setting(key=key, value=value))
    db.commit()

    result = {}
    for key in SETTING_KEYS:
        result[key] = _mask(get_setting(db, key))
    return result
