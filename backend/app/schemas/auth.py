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


class PasswordForgotRequest(BaseModel):
    username: str = Field(min_length=3, max_length=80)
    telegram_username: str = Field(min_length=3, max_length=64)


class PasswordForgotResponse(BaseModel):
    status: str
    message: str


class PasswordResetRequest(BaseModel):
    token: str = Field(min_length=12, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)


class PasswordResetResponse(BaseModel):
    status: str
    message: str


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
    username: str
    telegram_username: str | None = None
    age: int | None = None
    city: str | None = None
    surfboard: str | None = None
    surf_level: SurfLevel | None = None
    has_car: bool | None = None
    car_seats: int | None = Field(default=None, ge=0, le=6)
    phone_number: str | None = None
    favorite_spots: list[str] = Field(default_factory=list)
    avatar_url: str | None = None


class ProfileUpdate(BaseModel):
    age: int | None = Field(default=None, ge=8, le=90)
    city: str | None = Field(default=None, min_length=2, max_length=120)
    surfboard: str | None = Field(default=None, min_length=2, max_length=140)
    surf_level: SurfLevel | None = None
    has_car: bool | None = None
    car_seats: int | None = Field(default=None, ge=0, le=6)
    phone_number: str | None = Field(default=None, min_length=9, max_length=32)
    favorite_spots: list[str] | None = Field(default=None, max_length=3)
