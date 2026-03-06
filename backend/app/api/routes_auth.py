from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db_dep
from app.models.user import User
from app.schemas.auth import AuthResponse, LoginRequest, RegisterRequest, UserRead
from app.services.auth_service import authenticate_user, create_user, issue_token

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=AuthResponse)
def register(payload: RegisterRequest, db: Session = Depends(get_db_dep)) -> AuthResponse:
    user = create_user(db, payload.username.strip().lower(), payload.password)
    token = issue_token(user)
    return AuthResponse(access_token=token, username=user.username)


@router.post("/login", response_model=AuthResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db_dep)) -> AuthResponse:
    user = authenticate_user(db, payload.username.strip().lower(), payload.password)
    token = issue_token(user)
    return AuthResponse(access_token=token, username=user.username)


@router.get("/me", response_model=UserRead)
def me(current_user: User = Depends(get_current_user)) -> User:
    return current_user
