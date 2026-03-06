from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.task import Task, TaskStatus
from app.schemas.task import TaskCreate, TaskStats


def list_tasks(db: Session) -> list[Task]:
    stmt = select(Task).order_by(Task.created_at.desc())
    return list(db.scalars(stmt).all())


def create_task(db: Session, payload: TaskCreate) -> Task:
    task = Task(**payload.model_dump())
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


def update_status(db: Session, task: Task, status: TaskStatus) -> Task:
    task.status = status
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


def delete_task(db: Session, task: Task) -> None:
    db.delete(task)
    db.commit()


def get_task_stats(db: Session) -> TaskStats:
    total = db.scalar(select(func.count(Task.id))) or 0

    if total == 0:
        return TaskStats(
            total=0,
            backlog=0,
            in_progress=0,
            done=0,
            avg_priority=0,
            completion_rate=0,
        )

    counts = {
        status: db.scalar(select(func.count(Task.id)).where(Task.status == status)) or 0
        for status in TaskStatus
    }

    avg_priority = db.scalar(select(func.avg(Task.priority))) or 0
    completion_rate = (counts[TaskStatus.done] / total) * 100

    return TaskStats(
        total=total,
        backlog=counts[TaskStatus.backlog],
        in_progress=counts[TaskStatus.in_progress],
        done=counts[TaskStatus.done],
        avg_priority=round(float(avg_priority), 2),
        completion_rate=round(completion_rate, 2),
    )
