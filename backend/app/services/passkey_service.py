import base64
import json
from datetime import datetime, timedelta, timezone
from urllib.parse import urlparse

from fastapi import HTTPException, status
from sqlalchemy import delete, select
from sqlalchemy.orm import Session
from webauthn import (
    generate_authentication_options,
    generate_registration_options,
    verify_authentication_response,
    verify_registration_response,
)
from webauthn.helpers import options_to_json
from webauthn.helpers.structs import (
    AuthenticatorSelectionCriteria,
    PublicKeyCredentialDescriptor,
    ResidentKeyRequirement,
    UserVerificationRequirement,
)

from app.core.config import get_settings
from app.models.passkey import PasskeyChallenge, PasskeyCredential
from app.models.user import User

settings = get_settings()


def _utc_now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _b64url_decode(value: str) -> bytes:
    padded = value + "=" * (-len(value) % 4)
    return base64.urlsafe_b64decode(padded.encode("ascii"))


def _challenge_bytes(value: str) -> bytes:
    return _b64url_decode(value)


def _rp_id() -> str:
    configured = (settings.public_web_url or "").strip()
    if configured:
        parsed = urlparse(configured)
        if parsed.hostname:
            return parsed.hostname
    origins = [item.strip() for item in settings.cors_origins.split(",") if item.strip()]
    if origins:
        parsed = urlparse(origins[0])
        if parsed.hostname:
            return parsed.hostname
    return "localhost"


def _expected_origins() -> list[str]:
    values = [item.strip().rstrip("/") for item in settings.cors_origins.split(",") if item.strip()]
    configured = (settings.public_web_url or "").strip().rstrip("/")
    if configured:
        values.append(configured)
    unique: list[str] = []
    for item in values:
        if item and item not in unique:
            unique.append(item)
    return unique or ["http://localhost:5173"]


def _cleanup_expired_challenges(db: Session) -> None:
    db.execute(delete(PasskeyChallenge).where(PasskeyChallenge.expires_at <= _utc_now()))
    db.commit()


def begin_passkey_registration(db: Session, user: User) -> dict:
    _cleanup_expired_challenges(db)
    credentials = list(
        db.scalars(select(PasskeyCredential).where(PasskeyCredential.user_id == user.id)).all()
    )
    exclude_descriptors = [
        PublicKeyCredentialDescriptor(id=_b64url_decode(item.credential_id))
        for item in credentials
    ]

    options = generate_registration_options(
        rp_id=_rp_id(),
        rp_name="SurfCrew Planner",
        user_id=str(user.id).encode("utf-8"),
        user_name=user.username,
        user_display_name=user.username,
        timeout=60000,
        user_verification=UserVerificationRequirement.PREFERRED,
        authenticator_selection=AuthenticatorSelectionCriteria(
            resident_key=ResidentKeyRequirement.PREFERRED
        ),
        exclude_credentials=exclude_descriptors,
    )
    challenge = _b64url_encode(options.challenge)
    db.add(
        PasskeyChallenge(
            flow="register",
            challenge=challenge,
            user_id=user.id,
            username=user.username,
            expires_at=_utc_now() + timedelta(minutes=5),
        )
    )
    db.commit()
    raw = options_to_json(options)
    return json.loads(raw) if isinstance(raw, str) else raw


def finish_passkey_registration(db: Session, user: User, credential: dict) -> None:
    # challenge is validated by library, we keep records by user and newest challenge.
    challenge_record = db.scalar(
        select(PasskeyChallenge)
        .where(PasskeyChallenge.flow == "register", PasskeyChallenge.user_id == user.id)
        .order_by(PasskeyChallenge.created_at.desc())
    )
    if not challenge_record or challenge_record.expires_at <= _utc_now():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Passkey challenge expired")

    try:
        verification = verify_registration_response(
            credential=credential,
            expected_challenge=_challenge_bytes(challenge_record.challenge),
            expected_rp_id=_rp_id(),
            expected_origin=_expected_origins(),
            require_user_verification=False,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Passkey verification failed: {exc}",
        ) from exc

    credential_id = _b64url_encode(verification.credential_id)
    public_key_b64 = _b64url_encode(verification.credential_public_key)
    existing = db.scalar(select(PasskeyCredential).where(PasskeyCredential.credential_id == credential_id))
    if existing and existing.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Passkey already bound to another account")

    transports = credential.get("response", {}).get("transports") or []
    if isinstance(transports, list):
        transports_csv = ",".join(str(item) for item in transports if item)
    else:
        transports_csv = None

    if existing:
        existing.public_key_b64 = public_key_b64
        existing.sign_count = int(verification.sign_count or 0)
        existing.transports_csv = transports_csv
        db.add(existing)
    else:
        db.add(
            PasskeyCredential(
                user_id=user.id,
                credential_id=credential_id,
                public_key_b64=public_key_b64,
                sign_count=int(verification.sign_count or 0),
                transports_csv=transports_csv,
            )
        )
    db.execute(delete(PasskeyChallenge).where(PasskeyChallenge.id == challenge_record.id))
    db.commit()


def begin_passkey_authentication(db: Session, username: str) -> dict:
    _cleanup_expired_challenges(db)
    user = db.scalar(select(User).where(User.username == username.strip().lower()))
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    credentials = list(
        db.scalars(select(PasskeyCredential).where(PasskeyCredential.user_id == user.id)).all()
    )
    if not credentials:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No passkeys found for this user")

    allow_credentials = [
        PublicKeyCredentialDescriptor(id=_b64url_decode(item.credential_id))
        for item in credentials
    ]
    options = generate_authentication_options(
        rp_id=_rp_id(),
        timeout=60000,
        user_verification=UserVerificationRequirement.PREFERRED,
        allow_credentials=allow_credentials,
    )
    challenge = _b64url_encode(options.challenge)
    db.add(
        PasskeyChallenge(
            flow="authenticate",
            challenge=challenge,
            user_id=user.id,
            username=user.username,
            expires_at=_utc_now() + timedelta(minutes=5),
        )
    )
    db.commit()
    raw = options_to_json(options)
    return json.loads(raw) if isinstance(raw, str) else raw


def finish_passkey_authentication(db: Session, username: str, credential: dict) -> User:
    user = db.scalar(select(User).where(User.username == username.strip().lower()))
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    challenge_record = db.scalar(
        select(PasskeyChallenge)
        .where(PasskeyChallenge.flow == "authenticate", PasskeyChallenge.user_id == user.id)
        .order_by(PasskeyChallenge.created_at.desc())
    )
    if not challenge_record or challenge_record.expires_at <= _utc_now():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Passkey challenge expired")

    credential_id = credential.get("id")
    if not credential_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing credential id")
    stored = db.scalar(
        select(PasskeyCredential).where(
            PasskeyCredential.user_id == user.id,
            PasskeyCredential.credential_id == credential_id,
        )
    )
    if not stored:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unknown passkey")

    try:
        verification = verify_authentication_response(
            credential=credential,
            expected_challenge=_challenge_bytes(challenge_record.challenge),
            expected_rp_id=_rp_id(),
            expected_origin=_expected_origins(),
            credential_public_key=_b64url_decode(stored.public_key_b64),
            credential_current_sign_count=stored.sign_count,
            require_user_verification=False,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Passkey login failed: {exc}",
        ) from exc

    stored.sign_count = int(verification.new_sign_count)
    stored.last_used_at = _utc_now()
    db.add(stored)
    db.execute(delete(PasskeyChallenge).where(PasskeyChallenge.id == challenge_record.id))
    db.commit()
    return user
