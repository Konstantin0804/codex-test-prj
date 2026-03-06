from datetime import date, timedelta

from sqlalchemy import delete

from app.db.session import SessionLocal
from app.models.task import Task, TaskStatus


def run() -> None:
    db = SessionLocal()
    try:
        db.execute(delete(Task))
        sample = [
            Task(
                title="Stabilize payments webhook",
                description="Retry failed callbacks + alerting channel",
                status=TaskStatus.in_progress,
                priority=5,
                estimate_hours=10,
                due_date=date.today() + timedelta(days=2),
            ),
            Task(
                title="Onboarding checklist revamp",
                description="Unify first-login experience and docs",
                status=TaskStatus.backlog,
                priority=3,
                estimate_hours=6,
                due_date=date.today() + timedelta(days=5),
            ),
            Task(
                title="Archive stale feature flags",
                description="Cleanup old toggles from production",
                status=TaskStatus.done,
                priority=2,
                estimate_hours=2,
                due_date=date.today() + timedelta(days=1),
            ),
        ]
        db.add_all(sample)
        db.commit()
    finally:
        db.close()


if __name__ == "__main__":
    run()
