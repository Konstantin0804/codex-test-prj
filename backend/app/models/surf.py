import enum
from datetime import date, datetime, time

from sqlalchemy import (
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    Text,
    Time,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class GroupRole(str, enum.Enum):
    admin = "admin"
    member = "member"


class InviteStatus(str, enum.Enum):
    pending = "pending"
    accepted = "accepted"
    expired = "expired"


class SessionLevel(str, enum.Enum):
    beginner = "beginner"
    intermediate = "intermediate"
    advanced = "advanced"
    mixed = "mixed"


class RSVPStatus(str, enum.Enum):
    going = "going"
    maybe = "maybe"
    not_going = "not_going"


class SessionInviteStatus(str, enum.Enum):
    pending = "pending"
    pending_verification = "pending_verification"
    accepted = "accepted"
    declined = "declined"


class FriendRequestStatus(str, enum.Enum):
    pending = "pending"
    accepted = "accepted"
    declined = "declined"


class SurfGroup(Base):
    __tablename__ = "surf_groups"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="", nullable=False)
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)


class GroupMembership(Base):
    __tablename__ = "group_memberships"
    __table_args__ = (UniqueConstraint("group_id", "user_id", name="uq_group_membership"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    group_id: Mapped[int] = mapped_column(ForeignKey("surf_groups.id"), nullable=False, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    role: Mapped[GroupRole] = mapped_column(Enum(GroupRole), default=GroupRole.member, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)


class GroupInvite(Base):
    __tablename__ = "group_invites"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    group_id: Mapped[int] = mapped_column(ForeignKey("surf_groups.id"), nullable=False, index=True)
    code: Mapped[str] = mapped_column(String(32), unique=True, nullable=False, index=True)
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    status: Mapped[InviteStatus] = mapped_column(Enum(InviteStatus), default=InviteStatus.pending, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    accepted_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    accepted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)


class SurfSession(Base):
    __tablename__ = "surf_sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    group_id: Mapped[int] = mapped_column(ForeignKey("surf_groups.id"), nullable=False, index=True)
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    spot_name: Mapped[str] = mapped_column(String(140), nullable=False)
    session_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    meeting_time: Mapped[time | None] = mapped_column(Time, nullable=True)
    level: Mapped[SessionLevel] = mapped_column(Enum(SessionLevel), default=SessionLevel.mixed, nullable=False)
    forecast_note: Mapped[str] = mapped_column(Text, default="", nullable=False)
    logistics_note: Mapped[str] = mapped_column(Text, default="", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)


class SessionRSVP(Base):
    __tablename__ = "session_rsvps"
    __table_args__ = (UniqueConstraint("session_id", "user_id", name="uq_session_rsvp"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    session_id: Mapped[int] = mapped_column(ForeignKey("surf_sessions.id"), nullable=False, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    status: Mapped[RSVPStatus] = mapped_column(Enum(RSVPStatus), nullable=False)
    transport_note: Mapped[str] = mapped_column(String(180), default="", nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)


class SessionReport(Base):
    __tablename__ = "session_reports"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    session_id: Mapped[int] = mapped_column(ForeignKey("surf_sessions.id"), nullable=False, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    wave_score: Mapped[int] = mapped_column(Integer, nullable=False)
    crowd_score: Mapped[int] = mapped_column(Integer, nullable=False)
    wind_score: Mapped[int] = mapped_column(Integer, nullable=False)
    note: Mapped[str] = mapped_column(Text, default="", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)


class SessionPhoto(Base):
    __tablename__ = "session_photos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    session_id: Mapped[int] = mapped_column(ForeignKey("surf_sessions.id"), nullable=False, index=True)
    uploaded_by_user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    object_key: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    public_url: Mapped[str] = mapped_column(String(512), nullable=False)
    content_type: Mapped[str] = mapped_column(String(80), nullable=False)
    file_size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)


class SessionInvite(Base):
    __tablename__ = "session_invites"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    session_id: Mapped[int] = mapped_column(ForeignKey("surf_sessions.id"), nullable=False, index=True)
    group_id: Mapped[int] = mapped_column(ForeignKey("surf_groups.id"), nullable=False, index=True)
    invited_by_user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    invited_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)
    invited_telegram_username: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    invite_token: Mapped[str | None] = mapped_column(String(48), nullable=True, unique=True, index=True)
    status: Mapped[SessionInviteStatus] = mapped_column(
        Enum(SessionInviteStatus), default=SessionInviteStatus.pending, nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    accepted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


class InboxItem(Base):
    __tablename__ = "inbox_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    item_type: Mapped[str] = mapped_column(String(40), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(180), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False, default="")
    related_invite_id: Mapped[int | None] = mapped_column(
        ForeignKey("session_invites.id"), nullable=True, index=True
    )
    is_read: Mapped[bool] = mapped_column(default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)


class FriendRequest(Base):
    __tablename__ = "friend_requests"
    __table_args__ = (UniqueConstraint("from_user_id", "to_user_id", name="uq_friend_request_pair"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    from_user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    to_user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    status: Mapped[FriendRequestStatus] = mapped_column(
        Enum(FriendRequestStatus), default=FriendRequestStatus.pending, nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    acted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


class Friendship(Base):
    __tablename__ = "friendships"
    __table_args__ = (UniqueConstraint("user_low_id", "user_high_id", name="uq_friendship_pair"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_low_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    user_high_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
