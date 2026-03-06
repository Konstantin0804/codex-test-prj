from datetime import date, datetime, time

from pydantic import BaseModel, ConfigDict, Field

from app.models.surf import GroupRole, InviteStatus, RSVPStatus, SessionLevel


class GroupCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    description: str = ""


class GroupRead(BaseModel):
    id: int
    name: str
    description: str
    role: GroupRole
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class InviteRead(BaseModel):
    code: str
    status: InviteStatus
    expires_at: datetime


class JoinInvitePayload(BaseModel):
    code: str = Field(min_length=8, max_length=32)


class SessionCreate(BaseModel):
    spot_name: str = Field(min_length=2, max_length=140)
    session_date: date
    meeting_time: time | None = None
    level: SessionLevel = SessionLevel.mixed
    forecast_note: str = ""
    logistics_note: str = ""


class SessionRead(BaseModel):
    id: int
    group_id: int
    spot_name: str
    session_date: date
    meeting_time: time | None
    level: SessionLevel
    forecast_note: str
    logistics_note: str
    created_at: datetime
    my_rsvp: RSVPStatus | None = None

    model_config = ConfigDict(from_attributes=True)


class RSVPUpdate(BaseModel):
    status: RSVPStatus
    transport_note: str = ""


class SessionReportCreate(BaseModel):
    wave_score: int = Field(ge=1, le=10)
    crowd_score: int = Field(ge=1, le=10)
    wind_score: int = Field(ge=1, le=10)
    note: str = ""


class SessionReportRead(BaseModel):
    id: int
    session_id: int
    username: str
    wave_score: int
    crowd_score: int
    wind_score: int
    note: str
    created_at: datetime
