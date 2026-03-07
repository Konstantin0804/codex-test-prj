from fastapi import APIRouter, Depends, File, UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db_dep
from app.models.user import User
from app.schemas.auth import (
    AuthResponse,
    LoginRequest,
    ProfileRead,
    ProfileUpdate,
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
    parse_favorite_spots,
    trigger_telegram_verification,
    update_avatar,
    update_profile,
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


@router.get("/profile", response_model=ProfileRead)
def get_profile(current_user: User = Depends(get_current_user)) -> ProfileRead:
    return ProfileRead(
        username=current_user.username,
        telegram_username=current_user.telegram_username,
        age=current_user.age,
        city=current_user.city,
        surfboard=current_user.surfboard,
        surf_level=current_user.surf_level,
        phone_number=current_user.phone_number,
        favorite_spots=parse_favorite_spots(current_user.favorite_spots_csv),
        avatar_url=current_user.avatar_url,
    )


@router.patch("/profile", response_model=ProfileRead)
def patch_profile(
    payload: ProfileUpdate,
    db: Session = Depends(get_db_dep),
    current_user: User = Depends(get_current_user),
) -> ProfileRead:
    updated = update_profile(
        db,
        current_user,
        age=payload.age,
        city=payload.city,
        surfboard=payload.surfboard,
        surf_level=payload.surf_level,
        phone_number=payload.phone_number,
        favorite_spots=payload.favorite_spots,
    )
    return ProfileRead(
        username=updated.username,
        telegram_username=updated.telegram_username,
        age=updated.age,
        city=updated.city,
        surfboard=updated.surfboard,
        surf_level=updated.surf_level,
        phone_number=updated.phone_number,
        favorite_spots=parse_favorite_spots(updated.favorite_spots_csv),
        avatar_url=updated.avatar_url,
    )


@router.post("/profile/avatar", response_model=ProfileRead)
async def post_profile_avatar(
    avatar: UploadFile = File(...),
    db: Session = Depends(get_db_dep),
    current_user: User = Depends(get_current_user),
) -> ProfileRead:
    data = await avatar.read()
    updated = update_avatar(
        db,
        current_user,
        content_type=avatar.content_type or "application/octet-stream",
        data=data,
    )
    return ProfileRead(
        username=updated.username,
        telegram_username=updated.telegram_username,
        age=updated.age,
        city=updated.city,
        surfboard=updated.surfboard,
        surf_level=updated.surf_level,
        phone_number=updated.phone_number,
        favorite_spots=parse_favorite_spots(updated.favorite_spots_csv),
        avatar_url=updated.avatar_url,
    )
