from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db_dep
from app.models.task import Task
from app.schemas.task import TaskCreate, TaskRead, TaskStats, TaskStatusUpdate
from app.services.task_service import (
    create_task,
    delete_task,
    get_task_stats,
    list_tasks,
    update_status,
)

router = APIRouter(prefix="/tasks", tags=["tasks"])


@router.get("", response_model=list[TaskRead])
def get_tasks(db: Session = Depends(get_db_dep)) -> list[Task]:
    return list_tasks(db)


@router.get("/stats", response_model=TaskStats)
def get_stats(db: Session = Depends(get_db_dep)) -> TaskStats:
    return get_task_stats(db)


@router.post("", response_model=TaskRead, status_code=status.HTTP_201_CREATED)
def post_task(payload: TaskCreate, db: Session = Depends(get_db_dep)) -> Task:
    return create_task(db, payload)


@router.patch("/{task_id}/status", response_model=TaskRead)
def patch_task_status(
    task_id: int,
    payload: TaskStatusUpdate,
    db: Session = Depends(get_db_dep),
) -> Task:
    task = db.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return update_status(db, task, payload.status)


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_task(task_id: int, db: Session = Depends(get_db_dep)) -> None:
    task = db.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    delete_task(db, task)
