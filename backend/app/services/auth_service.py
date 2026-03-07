import secrets
import re

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.surf_spots import SURF_SPOT_NAMES
from app.core.security import create_access_token, hash_password, verify_password
from app.models.telegram import TelegramChatLink
from app.models.user import User
from app.services.surf_service import attach_registration_invite
from app.services.storage_service import upload_user_avatar
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
    username_norm = username.strip().lower()
    tg_norm = normalize_telegram_username(telegram_username)
    existing = db.scalar(select(User).where(User.username == username_norm))
    existing_tg = db.scalar(select(User).where(User.telegram_username == tg_norm))

    # Allow retrying registration for accounts that are still pending Telegram verification.
    if existing:
        if existing.is_telegram_verified:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username already exists")

        if existing_tg and existing_tg.id != existing.id:
            if existing_tg.is_telegram_verified:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT, detail="Telegram username already used"
                )
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Telegram username already has a pending registration",
            )

        verify_token = secrets.token_urlsafe(24).replace("-", "").replace("_", "")[:32]
        chat_link = db.scalar(
            select(TelegramChatLink).where(TelegramChatLink.telegram_username == tg_norm)
        )
        existing.password_hash = hash_password(password)
        existing.telegram_username = tg_norm
        existing.telegram_chat_id = chat_link.chat_id if chat_link else existing.telegram_chat_id
        existing.is_telegram_verified = False
        existing.telegram_verify_token = verify_token
        db.add(existing)
        db.commit()
        db.refresh(existing)
        attach_registration_invite(db, existing, invite_token)
        db.refresh(existing)
        return existing

    if existing_tg:
        if existing_tg.is_telegram_verified:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT, detail="Telegram username already used"
            )
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Telegram username already has a pending registration. "
                "Use the same username to retry or complete verification in Telegram."
            ),
        )

    chat_link = db.scalar(
        select(TelegramChatLink).where(TelegramChatLink.telegram_username == tg_norm)
    )
    verify_token = secrets.token_urlsafe(24).replace("-", "").replace("_", "")[:32]

    user = User(
        username=username_norm,
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
    fallback = "Open Telegram bot, press Start, then return and repeat registration/login."
    if settings.telegram_bot_username:
        fallback = f"Open @{settings.telegram_bot_username}, press Start, then return and login."
    return (
        "pending_telegram_verification",
        fallback,
    )


def get_bot_link(user: User) -> str | None:
    if not user.telegram_verify_token:
        return None
    link = bot_start_link(user.telegram_verify_token)
    return link or None


def _normalize_phone_es(value: str) -> str:
    digits = re.sub(r"\D", "", value)
    if len(digits) < 9:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Phone number must contain at least 9 digits",
        )
    local = digits[-9:]
    return f"+34 {local[:3]}-{local[3:6]}-{local[6:9]}"


def parse_favorite_spots(csv_value: str | None) -> list[str]:
    if not csv_value:
        return []
    return [item for item in csv_value.split("|") if item]


def update_profile(
    db: Session,
    user: User,
    *,
    age: int,
    city: str,
    surfboard: str,
    surf_level: str,
    phone_number: str,
    favorite_spots: list[str],
) -> User:
    cleaned_spots = [item.strip() for item in favorite_spots if item.strip()]
    if len(cleaned_spots) == 0 or len(cleaned_spots) > 3:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Favorite spots must contain between 1 and 3 items",
        )
    if len(set(cleaned_spots)) != len(cleaned_spots):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Favorite spots should not contain duplicates",
        )
    invalid = [item for item in cleaned_spots if item not in SURF_SPOT_NAMES]
    if invalid:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Unknown surf spot: {invalid[0]}",
        )

    user.age = age
    user.city = city.strip()
    user.surfboard = surfboard.strip()
    user.surf_level = surf_level
    user.phone_number = _normalize_phone_es(phone_number)
    user.favorite_spots_csv = "|".join(cleaned_spots)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def update_avatar(db: Session, user: User, content_type: str, data: bytes) -> User:
    _, public_url = upload_user_avatar(data, content_type, user.id)
    user.avatar_url = public_url
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
