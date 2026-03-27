import uuid
from datetime import datetime
from typing import Dict, List, Optional


class TaskManager:
    """Simple in-memory task tracker for background jobs."""

    def __init__(self):
        self._tasks: Dict[str, dict] = {}

    def create_task(self, task_type: str, message: str = "", total: int = 0) -> str:
        task_id = str(uuid.uuid4())[:8]
        self._tasks[task_id] = {
            "task_id": task_id,
            "type": task_type,
            "status": "running",
            "progress_current": 0,
            "progress_total": total,
            "message": message,
            "created_at": datetime.utcnow(),
        }
        return task_id

    def update_task(
        self,
        task_id: str,
        *,
        status: Optional[str] = None,
        progress_current: Optional[int] = None,
        progress_total: Optional[int] = None,
        message: Optional[str] = None,
    ):
        task = self._tasks.get(task_id)
        if not task:
            return
        if status is not None:
            task["status"] = status
        if progress_current is not None:
            task["progress_current"] = progress_current
        if progress_total is not None:
            task["progress_total"] = progress_total
        if message is not None:
            task["message"] = message

    def get_active_tasks(self) -> List[dict]:
        return [t for t in self._tasks.values() if t["status"] == "running"]

    def get_all_tasks(self) -> List[dict]:
        return list(self._tasks.values())


# Global singleton
task_manager = TaskManager()
