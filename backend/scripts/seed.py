from datetime import date, timedelta

from sqlalchemy import delete
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models.task import Task, TaskStatus
from app.models.user import User

DEMO_USERNAME = "demo"
DEMO_PASSWORD = "demo12345"


def get_or_create_demo_user(db: Session) -> User:
    user = db.query(User).filter(User.username == DEMO_USERNAME).first()
    if user:
        return user

    user = User(username=DEMO_USERNAME, password_hash=hash_password(DEMO_PASSWORD))
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def run() -> None:
    db = SessionLocal()
    try:
        user = get_or_create_demo_user(db)
        db.execute(delete(Task))
        sample = [
            Task(
                title="Stabilize payments webhook",
                description="Retry failed callbacks + alerting channel",
                status=TaskStatus.in_progress,
                priority=5,
                estimate_hours=10,
                due_date=date.today() + timedelta(days=2),
                user_id=user.id,
            ),
            Task(
                title="Onboarding checklist revamp",
                description="Unify first-login experience and docs",
                status=TaskStatus.backlog,
                priority=3,
                estimate_hours=6,
                due_date=date.today() + timedelta(days=5),
                user_id=user.id,
            ),
            Task(
                title="Archive stale feature flags",
                description="Cleanup old toggles from production",
                status=TaskStatus.done,
                priority=2,
                estimate_hours=2,
                due_date=date.today() + timedelta(days=1),
                user_id=user.id,
            ),
        ]
        db.add_all(sample)
        db.commit()
    finally:
        db.close()


if __name__ == "__main__":
    run()
