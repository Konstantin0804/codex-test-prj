import secrets
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy import and_, select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.surf import (
    GroupInvite,
    GroupMembership,
    GroupRole,
    InboxItem,
    InviteStatus,
    SessionInvite,
    SessionInviteStatus,
    SessionReport,
    SessionRSVP,
    SurfGroup,
    SurfSession,
)
from app.models.telegram import TelegramChatLink
from app.models.user import User
from app.schemas.surf import SessionCreate
from app.services.telegram_service import normalize_telegram_username, send_message

settings = get_settings()


def _now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _get_membership(db: Session, group_id: int, user_id: int) -> GroupMembership | None:
    stmt = select(GroupMembership).where(
        GroupMembership.group_id == group_id,
        GroupMembership.user_id == user_id,
    )
    return db.scalar(stmt)


def _ensure_membership(db: Session, group_id: int, user_id: int) -> GroupMembership:
    existing = _get_membership(db, group_id, user_id)
    if existing:
        return existing
    membership = GroupMembership(group_id=group_id, user_id=user_id, role=GroupRole.member)
    db.add(membership)
    db.flush()
    return membership


def create_inbox_item(
    db: Session,
    user_id: int,
    item_type: str,
    title: str,
    body: str,
    related_invite_id: int | None = None,
) -> InboxItem:
    item = InboxItem(
        user_id=user_id,
        item_type=item_type,
        title=title,
        body=body,
        related_invite_id=related_invite_id,
    )
    db.add(item)
    db.flush()
    return item


def list_inbox_items(db: Session, user: User) -> list[InboxItem]:
    stmt = (
        select(InboxItem)
        .where(InboxItem.user_id == user.id)
        .order_by(InboxItem.created_at.desc())
    )
    return list(db.scalars(stmt).all())


def mark_inbox_read(db: Session, item_id: int, user: User) -> InboxItem:
    item = db.get(InboxItem, item_id)
    if not item or item.user_id != user.id:
        raise HTTPException(status_code=404, detail="Inbox item not found")
    item.is_read = True
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


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
        expires_at=_now() + timedelta(days=7),
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

    now = _now()
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


def create_session_invite(
    db: Session,
    session_id: int,
    inviter: User,
    username: str | None,
    telegram_username: str | None,
) -> SessionInvite:
    session = db.get(SurfSession, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    require_membership(db, session.group_id, inviter)

    if bool(username) == bool(telegram_username):
        raise HTTPException(
            status_code=400,
            detail="Provide exactly one target: username or telegram_username",
        )

    invite = SessionInvite(
        session_id=session.id,
        group_id=session.group_id,
        invited_by_user_id=inviter.id,
    )

    if username:
        target = db.scalar(select(User).where(User.username == username.strip().lower()))
        if not target:
            raise HTTPException(status_code=404, detail="Target user not found")
        invite.invited_user_id = target.id
        invite.status = SessionInviteStatus.pending
        db.add(invite)
        db.flush()

        create_inbox_item(
            db,
            target.id,
            "session_invite",
            f"Surf invite: {session.spot_name} on {session.session_date}",
            f"@{inviter.username} invited you to a surf session.",
            related_invite_id=invite.id,
        )
        if target.telegram_chat_id:
            send_message(
                target.telegram_chat_id,
                f"@{inviter.username} invited you to surf at {session.spot_name} ({session.session_date}). Open app inbox to accept.",
            )
    else:
        tg_norm = normalize_telegram_username(telegram_username or "")
        if len(tg_norm) < 3:
            raise HTTPException(status_code=400, detail="Invalid telegram username")

        invite.invited_telegram_username = tg_norm
        invite.invite_token = secrets.token_urlsafe(24).replace("-", "").replace("_", "")[:32]
        invite.status = SessionInviteStatus.pending
        db.add(invite)
        db.flush()

        chat_link = db.scalar(
            select(TelegramChatLink).where(TelegramChatLink.telegram_username == tg_norm)
        )
        if chat_link:
            register_link = f"{settings.public_web_url}?invite={invite.invite_token}"
            send_message(
                chat_link.chat_id,
                (
                    f"You were invited to a surf session at {session.spot_name} ({session.session_date}).\n"
                    f"Register in SurfCrew Planner: {register_link}"
                ),
            )

    db.commit()
    db.refresh(invite)
    return invite


def accept_session_invite(db: Session, invite_id: int, user: User) -> SessionInvite:
    invite = db.get(SessionInvite, invite_id)
    if not invite:
        raise HTTPException(status_code=404, detail="Invite not found")
    if invite.status not in [SessionInviteStatus.pending, SessionInviteStatus.pending_verification]:
        raise HTTPException(status_code=400, detail="Invite is not active")
    if invite.invited_user_id and invite.invited_user_id != user.id:
        raise HTTPException(status_code=403, detail="Invite is not for current user")

    session = db.get(SurfSession, invite.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    invite.invited_user_id = user.id
    invite.status = SessionInviteStatus.accepted
    invite.accepted_at = _now()

    _ensure_membership(db, session.group_id, user.id)

    inviter = db.get(User, invite.invited_by_user_id)
    if inviter:
        create_inbox_item(
            db,
            inviter.id,
            "invite_accepted",
            "Invite accepted",
            f"@{user.username} joined your session invite.",
            related_invite_id=invite.id,
        )
        if inviter.telegram_chat_id:
            send_message(inviter.telegram_chat_id, f"@{user.username} accepted your surf invite.")

    db.add(invite)
    db.commit()
    db.refresh(invite)
    return invite


def attach_registration_invite(db: Session, user: User, invite_token: str | None) -> None:
    if not invite_token:
        return

    stmt = select(SessionInvite).where(SessionInvite.invite_token == invite_token.strip())
    invite = db.scalar(stmt)
    if not invite:
        raise HTTPException(status_code=404, detail="Invite token not found")

    if invite.status != SessionInviteStatus.pending:
        raise HTTPException(status_code=400, detail="Invite token is no longer active")

    if not invite.invited_telegram_username or invite.invited_telegram_username != user.telegram_username:
        raise HTTPException(status_code=403, detail="Invite token does not match telegram username")

    invite.invited_user_id = user.id
    invite.status = SessionInviteStatus.pending_verification
    db.add(invite)
    db.commit()


def finalize_registration_invites(db: Session, user: User) -> None:
    stmt = select(SessionInvite).where(
        SessionInvite.invited_user_id == user.id,
        SessionInvite.status == SessionInviteStatus.pending_verification,
    )
    invites = list(db.scalars(stmt).all())
    if not invites:
        return

    now = _now()
    for invite in invites:
        session = db.get(SurfSession, invite.session_id)
        if not session:
            continue

        _ensure_membership(db, session.group_id, user.id)
        invite.status = SessionInviteStatus.accepted
        invite.accepted_at = now
        db.add(invite)

        inviter = db.get(User, invite.invited_by_user_id)
        if inviter:
            create_inbox_item(
                db,
                inviter.id,
                "invite_accepted",
                "Invite accepted",
                f"@{user.username} completed registration and joined your session invite.",
                related_invite_id=invite.id,
            )
            if inviter.telegram_chat_id:
                send_message(
                    inviter.telegram_chat_id,
                    f"@{user.username} completed registration and joined your surf invite.",
                )

    db.commit()


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
    rsvp.updated_at = _now()

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
