import secrets
import re
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.surf_spots import SURF_SPOT_NAMES
from app.core.security import (
    create_access_token,
    generate_refresh_token,
    hash_password,
    hash_refresh_token,
    verify_password,
)
from app.models.auth import RefreshSession
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


def _utc_now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def issue_refresh_token(db: Session, user: User) -> str:
    raw_token = generate_refresh_token()
    token_hash = hash_refresh_token(raw_token, settings.jwt_secret_key)
    expires_at = _utc_now() + timedelta(days=max(settings.refresh_token_expire_days, 1))
    db.add(
        RefreshSession(
            user_id=user.id,
            token_hash=token_hash,
            expires_at=expires_at,
        )
    )
    db.commit()
    return raw_token


def rotate_refresh_token(db: Session, raw_token: str) -> tuple[User, str]:
    token_hash = hash_refresh_token(raw_token, settings.jwt_secret_key)
    session = db.scalar(select(RefreshSession).where(RefreshSession.token_hash == token_hash))
    now = _utc_now()
    if not session or session.revoked_at or session.expires_at <= now:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh session")

    user = db.get(User, session.user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh session")

    session.revoked_at = now
    db.add(session)

    new_raw = generate_refresh_token()
    new_hash = hash_refresh_token(new_raw, settings.jwt_secret_key)
    db.add(
        RefreshSession(
            user_id=user.id,
            token_hash=new_hash,
            expires_at=now + timedelta(days=max(settings.refresh_token_expire_days, 1)),
        )
    )
    db.commit()
    return user, new_raw


def revoke_refresh_token(db: Session, raw_token: str | None) -> None:
    if not raw_token:
        return
    token_hash = hash_refresh_token(raw_token, settings.jwt_secret_key)
    session = db.scalar(select(RefreshSession).where(RefreshSession.token_hash == token_hash))
    if not session or session.revoked_at:
        return
    session.revoked_at = _utc_now()
    db.add(session)
    db.commit()


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


def _normalize_phone_international(value: str) -> str:
    digits = re.sub(r"\D", "", value)
    if len(digits) < 6 or len(digits) > 15:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Phone number must contain between 6 and 15 digits",
        )
    return f"+{digits}"


def parse_favorite_spots(csv_value: str | None) -> list[str]:
    if not csv_value:
        return []
    return [item for item in csv_value.split("|") if item]


def update_profile(
    db: Session,
    user: User,
    *,
    age: int | None,
    city: str | None,
    surfboard: str | None,
    surf_level: str | None,
    has_car: bool | None,
    car_seats: int | None,
    phone_number: str | None,
    favorite_spots: list[str] | None,
) -> User:
    if age is not None:
        user.age = age
    if city is not None:
        user.city = city.strip() or None
    if surfboard is not None:
        user.surfboard = surfboard.strip() or None
    if surf_level is not None:
        user.surf_level = surf_level
    if has_car is not None:
        user.has_car = has_car
        if has_car is False:
            user.car_seats = 0
    if car_seats is not None:
        if car_seats < 0 or car_seats > 6:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Car seats must be between 0 and 6",
            )
        user.car_seats = car_seats
    if user.has_car is False and (user.car_seats or 0) > 0:
        user.car_seats = 0
    if phone_number is not None:
        cleaned_phone = phone_number.strip()
        user.phone_number = _normalize_phone_international(cleaned_phone) if cleaned_phone else None

    if favorite_spots is not None:
        cleaned_spots = [item.strip() for item in favorite_spots if item.strip()]
        if len(cleaned_spots) > 3:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Favorite spots must contain up to 3 items",
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
