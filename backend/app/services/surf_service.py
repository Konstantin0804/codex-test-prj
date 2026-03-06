import secrets
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy import and_, select
from sqlalchemy.orm import Session

from app.models.surf import (
    GroupInvite,
    GroupMembership,
    GroupRole,
    InviteStatus,
    SessionReport,
    SessionRSVP,
    SurfGroup,
    SurfSession,
)
from app.models.user import User
from app.schemas.surf import SessionCreate


def _get_membership(db: Session, group_id: int, user_id: int) -> GroupMembership | None:
    stmt = select(GroupMembership).where(
        GroupMembership.group_id == group_id,
        GroupMembership.user_id == user_id,
    )
    return db.scalar(stmt)


def require_membership(db: Session, group_id: int, user: User) -> GroupMembership:
    membership = _get_membership(db, group_id, user.id)
    if not membership:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a group member")
    return membership


def require_admin(db: Session, group_id: int, user: User) -> GroupMembership:
    membership = require_membership(db, group_id, user)
    if membership.role != GroupRole.admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return membership


def create_group(db: Session, user: User, name: str, description: str) -> SurfGroup:
    group = SurfGroup(name=name, description=description, created_by=user.id)
    db.add(group)
    db.flush()

    membership = GroupMembership(group_id=group.id, user_id=user.id, role=GroupRole.admin)
    db.add(membership)
    db.commit()
    db.refresh(group)
    return group


def list_groups(db: Session, user: User) -> list[tuple[SurfGroup, GroupMembership]]:
    stmt = (
        select(SurfGroup, GroupMembership)
        .join(GroupMembership, GroupMembership.group_id == SurfGroup.id)
        .where(GroupMembership.user_id == user.id)
        .order_by(SurfGroup.created_at.desc())
    )
    return list(db.execute(stmt).all())


def create_invite(db: Session, group_id: int, user: User) -> GroupInvite:
    require_admin(db, group_id, user)
    invite = GroupInvite(
        group_id=group_id,
        code=secrets.token_urlsafe(8).replace("-", "").replace("_", "")[:12],
        created_by=user.id,
        status=InviteStatus.pending,
        expires_at=datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(days=7),
    )
    db.add(invite)
    db.commit()
    db.refresh(invite)
    return invite


def join_by_code(db: Session, code: str, user: User) -> SurfGroup:
    stmt = select(GroupInvite).where(GroupInvite.code == code.strip())
    invite = db.scalar(stmt)
    if not invite:
        raise HTTPException(status_code=404, detail="Invite not found")

    now = datetime.now(timezone.utc).replace(tzinfo=None)
    if invite.status != InviteStatus.pending or invite.expires_at < now:
        raise HTTPException(status_code=400, detail="Invite is not active")

    existing = _get_membership(db, invite.group_id, user.id)
    if not existing:
        db.add(GroupMembership(group_id=invite.group_id, user_id=user.id, role=GroupRole.member))

    invite.status = InviteStatus.accepted
    invite.accepted_by = user.id
    invite.accepted_at = now

    db.commit()
    group = db.get(SurfGroup, invite.group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    return group


def create_session(db: Session, group_id: int, payload: SessionCreate, user: User) -> SurfSession:
    require_membership(db, group_id, user)
    session = SurfSession(group_id=group_id, created_by=user.id, **payload.model_dump())
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


def list_sessions(db: Session, group_id: int, user: User) -> list[SurfSession]:
    require_membership(db, group_id, user)
    stmt = (
        select(SurfSession)
        .where(SurfSession.group_id == group_id)
        .order_by(SurfSession.session_date.asc(), SurfSession.meeting_time.asc())
    )
    return list(db.scalars(stmt).all())


def set_rsvp(db: Session, session_id: int, user: User, status_value, transport_note: str) -> SessionRSVP:
    session = db.get(SurfSession, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    require_membership(db, session.group_id, user)

    stmt = select(SessionRSVP).where(
        SessionRSVP.session_id == session_id,
        SessionRSVP.user_id == user.id,
    )
    rsvp = db.scalar(stmt)
    if not rsvp:
        rsvp = SessionRSVP(session_id=session_id, user_id=user.id, status=status_value)
        db.add(rsvp)

    rsvp.status = status_value
    rsvp.transport_note = transport_note
    rsvp.updated_at = datetime.now(timezone.utc).replace(tzinfo=None)

    db.commit()
    db.refresh(rsvp)
    return rsvp


def create_report(
    db: Session,
    session_id: int,
    user: User,
    wave_score: int,
    crowd_score: int,
    wind_score: int,
    note: str,
) -> SessionReport:
    session = db.get(SurfSession, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    require_membership(db, session.group_id, user)

    report = SessionReport(
        session_id=session_id,
        user_id=user.id,
        wave_score=wave_score,
        crowd_score=crowd_score,
        wind_score=wind_score,
        note=note,
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    return report


def list_reports(db: Session, session_id: int, user: User) -> list[tuple[SessionReport, User]]:
    session = db.get(SurfSession, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    require_membership(db, session.group_id, user)

    stmt = (
        select(SessionReport, User)
        .join(User, User.id == SessionReport.user_id)
        .where(SessionReport.session_id == session_id)
        .order_by(SessionReport.created_at.desc())
    )
    return list(db.execute(stmt).all())


def my_rsvp_map(db: Session, session_ids: list[int], user_id: int) -> dict[int, str]:
    if not session_ids:
        return {}
    stmt = select(SessionRSVP).where(
        and_(SessionRSVP.user_id == user_id, SessionRSVP.session_id.in_(session_ids))
    )
    return {item.session_id: item.status.value for item in db.scalars(stmt).all()}
