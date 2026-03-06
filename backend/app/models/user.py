from datetime import datetime

from sqlalchemy import BigInteger, Boolean, DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    username: Mapped[str] = mapped_column(String(80), unique=True, nullable=False, index=True)
    telegram_username: Mapped[str | None] = mapped_column(
        String(64), unique=True, nullable=True, index=True
    )
    telegram_chat_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    is_telegram_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    telegram_verify_token: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
