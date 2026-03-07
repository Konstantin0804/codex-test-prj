from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class PasskeyCredential(Base):
    __tablename__ = "passkey_credentials"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    credential_id: Mapped[str] = mapped_column(String(255), nullable=False, unique=True, index=True)
    public_key_b64: Mapped[str] = mapped_column(String(4096), nullable=False)
    sign_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    transports_csv: Mapped[str | None] = mapped_column(String(128), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    last_used_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


class PasskeyChallenge(Base):
    __tablename__ = "passkey_challenges"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    flow: Mapped[str] = mapped_column(String(24), nullable=False, index=True)
    challenge: Mapped[str] = mapped_column(String(255), nullable=False, unique=True, index=True)
    username: Mapped[str | None] = mapped_column(String(80), nullable=True, index=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
