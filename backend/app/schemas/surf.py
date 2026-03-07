from datetime import date, datetime, time

from pydantic import BaseModel, ConfigDict, Field

from app.models.surf import (
    FriendRequestStatus,
    GroupRole,
    InviteStatus,
    RSVPStatus,
    SessionInviteStatus,
    SessionLevel,
)


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


class FriendRead(BaseModel):
    id: int
    username: str
    telegram_username: str | None = None


class UserDirectoryRead(BaseModel):
    id: int
    username: str
    avatar_url: str | None = None


class FriendRequestCreate(BaseModel):
    to_username: str = Field(min_length=3, max_length=80)


class FriendRequestRead(BaseModel):
    id: int
    from_username: str
    to_username: str
    status: FriendRequestStatus
    direction: str = "incoming"
    created_at: datetime


class GroupMemberRead(BaseModel):
    username: str
    role: GroupRole


class GroupSessionSummaryRead(BaseModel):
    id: int
    session_date: date
    spot_name: str
    average_rating: float | None = None


class GroupDetailRead(BaseModel):
    id: int
    name: str
    description: str
    members: list[GroupMemberRead]
    sessions: list[GroupSessionSummaryRead] = Field(default_factory=list)


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


class SessionForecastSnapshotRead(BaseModel):
    provider: str | None = None
    target_time: str | None = None
    wave_height_m: float | None = None
    wave_direction_deg: float | None = None
    wave_direction_cardinal: str | None = None
    wave_period_s: float | None = None
    wind_speed_kmh: float | None = None
    wind_direction_deg: float | None = None
    wind_direction_cardinal: str | None = None
    water_temperature_c: float | None = None
    sea_level_m: float | None = None
    tide_level: str | None = None
    tide_trend: str | None = None
    summary: str | None = None


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
    is_completed: bool = False
    completed_at: datetime | None = None
    can_complete: bool = False
    average_rating: float | None = None
    rating_count: int = 0
    forecast_snapshot: SessionForecastSnapshotRead | None = None

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


class SessionFeedbackCreate(BaseModel):
    stars: int | None = Field(default=None, ge=0, le=5)
    comment: str = ""


class SessionFeedbackRead(BaseModel):
    id: int
    session_id: int
    username: str
    stars: int | None = None
    comment: str
    updated_at: datetime


class SessionPhotoRead(BaseModel):
    id: int
    session_id: int
    uploaded_by_username: str
    public_url: str
    content_type: str
    file_size_bytes: int
    created_at: datetime


class SessionInviteCreate(BaseModel):
    username: str | None = None
    telegram_username: str | None = None


class SessionInviteRead(BaseModel):
    id: int
    session_id: int
    status: SessionInviteStatus
    invited_username: str | None = None
    invited_telegram_username: str | None = None
    invite_token: str | None = None
    created_at: datetime


class SessionInviteStatusRead(BaseModel):
    id: int
    invited_username: str | None = None
    invited_telegram_username: str | None = None
    status: SessionInviteStatus
    invited_by_username: str
    accepted_at: datetime | None = None


class SessionDetailRead(BaseModel):
    id: int
    group_id: int
    spot_name: str
    session_date: date
    meeting_time: time | None
    level: SessionLevel
    forecast_note: str
    logistics_note: str
    created_at: datetime
    created_by_username: str
    is_completed: bool
    completed_at: datetime | None = None
    average_rating: float | None = None
    rating_count: int = 0
    forecast_snapshot: SessionForecastSnapshotRead | None = None
    participants: list[str] = Field(default_factory=list)
    invites: list[SessionInviteStatusRead] = Field(default_factory=list)
    photos: list[SessionPhotoRead] = Field(default_factory=list)


class InboxItemRead(BaseModel):
    id: int
    item_type: str
    title: str
    body: str
    is_read: bool
    related_invite_id: int | None
    related_friend_request_id: int | None = None
    related_group_id: int | None = None
    related_session_id: int | None = None
    related_user_id: int | None = None
    related_username: str | None = None
    action_status: str = "none"
    action_required: bool = False
    created_at: datetime


class SpotForecastRead(BaseModel):
    provider: str
    spot_name: str
    session_date: date
    target_time: str
    wave_height_m: float | None = None
    wave_direction_deg: float | None = None
    wave_direction_cardinal: str
    wave_period_s: float | None = None
    wind_speed_kmh: float | None = None
    wind_direction_deg: float | None = None
    wind_direction_cardinal: str
    water_temperature_c: float | None = None
    sea_level_m: float | None = None
    tide_level: str
    tide_trend: str
    summary: str
