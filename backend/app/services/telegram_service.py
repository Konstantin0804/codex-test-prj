from datetime import datetime, timezone

import httpx
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.telegram import TelegramChatLink
from app.models.user import User

settings = get_settings()


def normalize_telegram_username(username: str) -> str:
    value = username.strip()
    if value.startswith("@"):
        value = value[1:]
    return value.lower()


def _bot_api_url(method: str) -> str:
    return f"https://api.telegram.org/bot{settings.telegram_bot_token}/{method}"


def upsert_chat_link(db: Session, telegram_username: str, chat_id: int) -> TelegramChatLink:
    username_norm = normalize_telegram_username(telegram_username)
    record = db.scalar(
        select(TelegramChatLink).where(TelegramChatLink.telegram_username == username_norm)
    )

    now = datetime.now(timezone.utc).replace(tzinfo=None)
    if not record:
        record = TelegramChatLink(telegram_username=username_norm, chat_id=chat_id)
        db.add(record)

    record.chat_id = chat_id
    record.updated_at = now
    db.commit()
    db.refresh(record)
    return record


def get_chat_link(db: Session, telegram_username: str) -> TelegramChatLink | None:
    username_norm = normalize_telegram_username(telegram_username)
    return db.scalar(select(TelegramChatLink).where(TelegramChatLink.telegram_username == username_norm))


def send_message(chat_id: int, text: str, reply_markup: dict | None = None) -> None:
    if not settings.telegram_bot_token:
        return

    payload: dict = {"chat_id": chat_id, "text": text}
    if reply_markup:
        payload["reply_markup"] = reply_markup

    try:
        httpx.post(_bot_api_url("sendMessage"), json=payload, timeout=8)
    except Exception:
        return


def send_verification_message(user: User) -> bool:
    if not settings.telegram_bot_token or not user.telegram_chat_id:
        return False

    callback_data = f"verify:{user.telegram_verify_token}"
    send_message(
        user.telegram_chat_id,
        (
            "SurfCrew Planner registration pending.\n"
            f"Account: @{user.username}\n"
            f"Telegram: @{user.telegram_username}\n\n"
            "Press Confirm to finish registration."
        ),
        reply_markup={
            "inline_keyboard": [[{"text": "Confirm registration", "callback_data": callback_data}]]
        },
    )
    return True


def bot_start_link(token: str) -> str:
    if not settings.telegram_bot_username:
        return ""
    return f"https://t.me/{settings.telegram_bot_username}?start=verify_{token}"


def complete_verification(db: Session, token: str, chat_id: int, tg_username: str | None) -> bool:
    if not token:
        return False

    user = db.scalar(select(User).where(User.telegram_verify_token == token))
    if not user:
        return False

    username_norm = normalize_telegram_username(tg_username) if tg_username else None
    if username_norm and user.telegram_username and username_norm != user.telegram_username:
        return False

    user.telegram_chat_id = chat_id
    user.is_telegram_verified = True
    user.telegram_verify_token = None
    db.add(user)
    db.commit()
    from app.services.surf_service import finalize_registration_invites

    finalize_registration_invites(db, user)
    return True


def process_update(db: Session, update: dict) -> None:
    message = update.get("message")
    if message:
        chat = message.get("chat", {})
        from_user = message.get("from", {})
        chat_id = chat.get("id")
        tg_username = from_user.get("username")
        text = (message.get("text") or "").strip()

        if chat_id and tg_username:
            upsert_chat_link(db, tg_username, int(chat_id))

        if text.startswith("/start"):
            payload = ""
            if " " in text:
                payload = text.split(" ", 1)[1]

            if payload.startswith("verify_") and chat_id:
                token = payload.replace("verify_", "", 1)
                ok = complete_verification(db, token, int(chat_id), tg_username)
                send_message(
                    int(chat_id),
                    "Registration confirmed. Go back to SurfCrew Planner and login."
                    if ok
                    else "Verification failed. Please request a new registration.",
                )
            elif chat_id:
                send_message(
                    int(chat_id),
                    "Hi from SurfCrew Planner. Use /start verify_<token> from your app link to verify.",
                )

    callback_query = update.get("callback_query")
    if callback_query:
        data = callback_query.get("data") or ""
        message = callback_query.get("message", {})
        chat = message.get("chat", {})
        from_user = callback_query.get("from", {})
        chat_id = chat.get("id")
        tg_username = from_user.get("username")

        if chat_id and tg_username:
            upsert_chat_link(db, tg_username, int(chat_id))

        if data.startswith("verify:") and chat_id:
            token = data.split(":", 1)[1]
            ok = complete_verification(db, token, int(chat_id), tg_username)
            send_message(
                int(chat_id),
                "Registration confirmed. Go back to SurfCrew Planner and login."
                if ok
                else "Verification failed. Please request a new registration.",
            )


def ensure_telegram_ready(user: User) -> None:
    if not user.is_telegram_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Telegram verification required",
        )
