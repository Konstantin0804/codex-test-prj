import secrets

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import create_access_token, hash_password, verify_password
from app.models.telegram import TelegramChatLink
from app.models.user import User
from app.services.surf_service import attach_registration_invite
from app.services.telegram_service import (
    bot_start_link,
    normalize_telegram_username,
    send_verification_message,
)

settings = get_settings()


def create_user(
    db: Session,
    username: str,
    password: str,
    telegram_username: str,
    invite_token: str | None = None,
) -> User:
    existing = db.scalar(select(User).where(User.username == username))
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username already exists")

    tg_norm = normalize_telegram_username(telegram_username)
    existing_tg = db.scalar(select(User).where(User.telegram_username == tg_norm))
    if existing_tg:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Telegram username already used"
        )

    chat_link = db.scalar(
        select(TelegramChatLink).where(TelegramChatLink.telegram_username == tg_norm)
    )
    verify_token = secrets.token_urlsafe(24).replace("-", "").replace("_", "")[:32]

    user = User(
        username=username,
        telegram_username=tg_norm,
        telegram_chat_id=chat_link.chat_id if chat_link else None,
        is_telegram_verified=False,
        telegram_verify_token=verify_token,
        password_hash=hash_password(password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    attach_registration_invite(db, user, invite_token)
    db.refresh(user)
    return user


def authenticate_user(db: Session, username: str, password: str) -> User:
    user = db.scalar(select(User).where(User.username == username))
    if not user or not verify_password(password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    if user.telegram_username and not user.is_telegram_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Telegram verification required. Open bot link from registration response.",
        )
    return user


def issue_token(user: User) -> str:
    return create_access_token(
        subject=str(user.id),
        secret_key=settings.jwt_secret_key,
        algorithm=settings.jwt_algorithm,
        expires_minutes=settings.access_token_expire_minutes,
    )


def trigger_telegram_verification(user: User) -> tuple[str, str | None]:
    sent = send_verification_message(user)
    if sent:
        return (
            "pending_telegram_verification",
            "Verification message sent to your Telegram. Confirm in bot and then login.",
        )
    return (
        "pending_telegram_verification",
        "Open Telegram bot link, press Start, then confirm registration.",
    )


def get_bot_link(user: User) -> str | None:
    if not user.telegram_verify_token:
        return None
    link = bot_start_link(user.telegram_verify_token)
    return link or None
