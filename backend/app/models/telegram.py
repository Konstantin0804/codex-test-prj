from datetime import datetime

from sqlalchemy import BigInteger, DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class TelegramChatLink(Base):
    __tablename__ = "telegram_chat_links"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    telegram_username: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    chat_id: Mapped[int] = mapped_column(BigInteger, unique=True, nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
