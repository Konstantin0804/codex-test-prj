from pydantic import BaseModel, ConfigDict, Field


class RegisterRequest(BaseModel):
    username: str = Field(min_length=3, max_length=80)
    password: str = Field(min_length=8, max_length=128)
    telegram_username: str = Field(min_length=3, max_length=64)


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
