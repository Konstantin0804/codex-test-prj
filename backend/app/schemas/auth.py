from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class RegisterRequest(BaseModel):
    username: str = Field(min_length=3, max_length=80)
    password: str = Field(min_length=8, max_length=128)
    telegram_username: str = Field(min_length=3, max_length=64)
    invite_token: str | None = None


class LoginRequest(BaseModel):
    username: str
    password: str


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    username: str


class RegisterResponse(BaseModel):
    status: str
    message: str
    bot_link: str | None = None


class UsernameCheckResponse(BaseModel):
    username: str
    available: bool


class UserRead(BaseModel):
    id: int
    username: str

    model_config = ConfigDict(from_attributes=True)


SurfLevel = Literal["beginner", "beginner_plus", "intermediate", "advanced", "pro"]


class ProfileRead(BaseModel):
    nickname: str | None = None
    telegram_username: str | None = None
    age: int | None = None
    city: str | None = None
    surfboard: str | None = None
    surf_level: SurfLevel | None = None
    phone_number: str | None = None
    favorite_spots: list[str] = Field(default_factory=list)


class ProfileUpdate(BaseModel):
    nickname: str = Field(min_length=2, max_length=80)
    age: int = Field(ge=8, le=90)
    city: str = Field(min_length=2, max_length=120)
    surfboard: str = Field(min_length=2, max_length=140)
    surf_level: SurfLevel
    phone_number: str = Field(min_length=9, max_length=32)
    favorite_spots: list[str] = Field(min_length=1, max_length=3)
