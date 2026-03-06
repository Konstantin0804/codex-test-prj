from datetime import date, datetime

from pydantic import BaseModel, Field

from app.models.task import TaskStatus


class TaskBase(BaseModel):
    title: str = Field(min_length=2, max_length=160)
    description: str = ""
    status: TaskStatus = TaskStatus.backlog
    priority: int = Field(ge=1, le=5)
    estimate_hours: int = Field(ge=1, le=120)
    due_date: date


class TaskCreate(TaskBase):
    pass


class TaskStatusUpdate(BaseModel):
    status: TaskStatus


class TaskRead(TaskBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class TaskStats(BaseModel):
    total: int
    backlog: int
    in_progress: int
    done: int
    avg_priority: float
    completion_rate: float
