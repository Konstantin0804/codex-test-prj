from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db_dep
from app.models.user import User
from app.schemas.auth import (
    AuthResponse,
    LoginRequest,
    RegisterRequest,
    RegisterResponse,
    UsernameCheckResponse,
    UserRead,
)
from app.services.auth_service import (
    authenticate_user,
    create_user,
    get_bot_link,
    issue_token,
    trigger_telegram_verification,
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/check-username", response_model=UsernameCheckResponse)
def check_username(username: str, db: Session = Depends(get_db_dep)) -> UsernameCheckResponse:
    normalized = username.strip().lower()
    if len(normalized) < 3:
        return UsernameCheckResponse(username=normalized, available=False)
    existing = db.scalar(select(User.id).where(User.username == normalized))
    return UsernameCheckResponse(username=normalized, available=existing is None)


@router.post("/register", response_model=RegisterResponse)
def register(payload: RegisterRequest, db: Session = Depends(get_db_dep)) -> RegisterResponse:
    user = create_user(
        db,
        payload.username.strip().lower(),
        payload.password,
        payload.telegram_username,
        payload.invite_token,
    )
    status_value, message = trigger_telegram_verification(user)
    return RegisterResponse(status=status_value, message=message, bot_link=get_bot_link(user))


@router.post("/login", response_model=AuthResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db_dep)) -> AuthResponse:
    user = authenticate_user(db, payload.username.strip().lower(), payload.password)
    token = issue_token(user)
    return AuthResponse(access_token=token, username=user.username)


@router.get("/me", response_model=UserRead)
def me(current_user: User = Depends(get_current_user)) -> User:
    return current_user
