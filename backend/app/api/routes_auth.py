from fastapi import APIRouter, Cookie, Depends, File, HTTPException, Response, UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db_dep
from app.core.config import get_settings
from app.models.user import User
from app.schemas.auth import (
    AuthResponse,
    LoginRequest,
    PasswordForgotRequest,
    PasswordForgotResponse,
    PasswordResetRequest,
    PasswordResetResponse,
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
    issue_refresh_token,
    parse_favorite_spots,
    request_password_reset,
    reset_password_with_token,
    revoke_refresh_token,
    rotate_refresh_token,
    trigger_telegram_verification,
    update_avatar,
    update_profile,
)

router = APIRouter(prefix="/auth", tags=["auth"])
settings = get_settings()


def _set_refresh_cookie(response: Response, raw_token: str) -> None:
    cookie_secure = settings.refresh_cookie_secure
    same_site = "none" if cookie_secure else "lax"
    response.set_cookie(
        key=settings.refresh_cookie_name,
        value=raw_token,
        httponly=True,
        secure=cookie_secure,
        samesite=same_site,
        max_age=max(settings.refresh_token_expire_days, 1) * 24 * 60 * 60,
        path="/",
    )


def _clear_refresh_cookie(response: Response) -> None:
    cookie_secure = settings.refresh_cookie_secure
    same_site = "none" if cookie_secure else "lax"
    response.delete_cookie(
        key=settings.refresh_cookie_name,
        httponly=True,
        secure=cookie_secure,
        samesite=same_site,
        path="/",
    )


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
def login(payload: LoginRequest, response: Response, db: Session = Depends(get_db_dep)) -> AuthResponse:
    user = authenticate_user(db, payload.username.strip().lower(), payload.password)
    token = issue_token(user)
    refresh = issue_refresh_token(db, user)
    _set_refresh_cookie(response, refresh)
    return AuthResponse(access_token=token, username=user.username)


@router.post("/refresh", response_model=AuthResponse)
def refresh_session(
    response: Response,
    refresh_cookie: str | None = Cookie(default=None, alias=settings.refresh_cookie_name),
    db: Session = Depends(get_db_dep),
) -> AuthResponse:
    if not refresh_cookie:
        raise HTTPException(status_code=401, detail="Missing refresh session")
    user, new_refresh = rotate_refresh_token(db, refresh_cookie)
    _set_refresh_cookie(response, new_refresh)
    token = issue_token(user)
    return AuthResponse(access_token=token, username=user.username)


@router.post("/password/forgot", response_model=PasswordForgotResponse)
def forgot_password(payload: PasswordForgotRequest, db: Session = Depends(get_db_dep)) -> PasswordForgotResponse:
    request_password_reset(
        db,
        username=payload.username,
        telegram_username=payload.telegram_username,
    )
    return PasswordForgotResponse(
        status="ok",
        message="If account details are valid, a reset link was sent to your Telegram.",
    )


@router.post("/password/reset", response_model=PasswordResetResponse)
def reset_password(payload: PasswordResetRequest, db: Session = Depends(get_db_dep)) -> PasswordResetResponse:
    reset_password_with_token(db, token=payload.token, new_password=payload.new_password)
    return PasswordResetResponse(status="ok", message="Password updated. Please login with your new password.")


@router.post("/logout")
def logout(
    response: Response,
    refresh_cookie: str | None = Cookie(default=None, alias=settings.refresh_cookie_name),
    db: Session = Depends(get_db_dep),
) -> dict[str, str]:
    revoke_refresh_token(db, refresh_cookie)
    _clear_refresh_cookie(response)
    return {"status": "ok"}


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
        has_car=current_user.has_car,
        car_seats=current_user.car_seats,
        phone_number=current_user.phone_number,
        favorite_spots=parse_favorite_spots(current_user.favorite_spots_csv),
        avatar_url=current_user.avatar_url,
    )


@router.get("/users/{username}/profile", response_model=ProfileRead)
def get_profile_by_username(
    username: str,
    db: Session = Depends(get_db_dep),
    current_user: User = Depends(get_current_user),
) -> ProfileRead:
    user = db.scalar(select(User).where(User.username == username.strip().lower()))
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return ProfileRead(
        username=user.username,
        telegram_username=user.telegram_username,
        age=user.age,
        city=user.city,
        surfboard=user.surfboard,
        surf_level=user.surf_level,
        has_car=user.has_car,
        car_seats=user.car_seats,
        phone_number=user.phone_number,
        favorite_spots=parse_favorite_spots(user.favorite_spots_csv),
        avatar_url=user.avatar_url,
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
        has_car=payload.has_car,
        car_seats=payload.car_seats,
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
        has_car=updated.has_car,
        car_seats=updated.car_seats,
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
        has_car=updated.has_car,
        car_seats=updated.car_seats,
        phone_number=updated.phone_number,
        favorite_spots=parse_favorite_spots(updated.favorite_spots_csv),
        avatar_url=updated.avatar_url,
    )
