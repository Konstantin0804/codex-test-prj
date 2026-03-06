from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db_dep
from app.models.user import User
from app.schemas.surf import (
    GroupCreate,
    GroupRead,
    InviteRead,
    JoinInvitePayload,
    RSVPUpdate,
    SessionCreate,
    SessionRead,
    SessionReportCreate,
    SessionReportRead,
)
from app.services.surf_service import (
    create_group,
    create_invite,
    create_report,
    create_session,
    join_by_code,
    list_groups,
    list_reports,
    list_sessions,
    my_rsvp_map,
    set_rsvp,
)

router = APIRouter(prefix="/surf", tags=["surf"])


@router.post("/groups", response_model=GroupRead)
def post_group(
    payload: GroupCreate,
    db: Session = Depends(get_db_dep),
    current_user: User = Depends(get_current_user),
) -> GroupRead:
    group = create_group(db, current_user, payload.name, payload.description)
    return GroupRead(
        id=group.id,
        name=group.name,
        description=group.description,
        role="admin",
        created_at=group.created_at,
    )


@router.get("/groups", response_model=list[GroupRead])
def get_groups(
    db: Session = Depends(get_db_dep),
    current_user: User = Depends(get_current_user),
) -> list[GroupRead]:
    records = list_groups(db, current_user)
    return [
        GroupRead(
            id=group.id,
            name=group.name,
            description=group.description,
            role=membership.role,
            created_at=group.created_at,
        )
        for group, membership in records
    ]


@router.post("/groups/{group_id}/invites", response_model=InviteRead)
def post_invite(
    group_id: int,
    db: Session = Depends(get_db_dep),
    current_user: User = Depends(get_current_user),
) -> InviteRead:
    invite = create_invite(db, group_id, current_user)
    return InviteRead(code=invite.code, status=invite.status, expires_at=invite.expires_at)


@router.post("/invites/join", response_model=GroupRead)
def post_join_invite(
    payload: JoinInvitePayload,
    db: Session = Depends(get_db_dep),
    current_user: User = Depends(get_current_user),
) -> GroupRead:
    group = join_by_code(db, payload.code, current_user)
    return GroupRead(
        id=group.id,
        name=group.name,
        description=group.description,
        role="member",
        created_at=group.created_at,
    )


@router.post("/groups/{group_id}/sessions", response_model=SessionRead)
def post_session(
    group_id: int,
    payload: SessionCreate,
    db: Session = Depends(get_db_dep),
    current_user: User = Depends(get_current_user),
) -> SessionRead:
    session = create_session(db, group_id, payload, current_user)
    return SessionRead.model_validate(session)


@router.get("/groups/{group_id}/sessions", response_model=list[SessionRead])
def get_sessions(
    group_id: int,
    date_from: date | None = None,
    date_to: date | None = None,
    db: Session = Depends(get_db_dep),
    current_user: User = Depends(get_current_user),
) -> list[SessionRead]:
    sessions = list_sessions(db, group_id, current_user)

    if date_from:
        sessions = [item for item in sessions if item.session_date >= date_from]
    if date_to:
        sessions = [item for item in sessions if item.session_date <= date_to]

    rsvp = my_rsvp_map(db, [item.id for item in sessions], current_user.id)
    return [
        SessionRead(
            id=item.id,
            group_id=item.group_id,
            spot_name=item.spot_name,
            session_date=item.session_date,
            meeting_time=item.meeting_time,
            level=item.level,
            forecast_note=item.forecast_note,
            logistics_note=item.logistics_note,
            created_at=item.created_at,
            my_rsvp=rsvp.get(item.id),
        )
        for item in sessions
    ]


@router.patch("/sessions/{session_id}/rsvp")
def patch_rsvp(
    session_id: int,
    payload: RSVPUpdate,
    db: Session = Depends(get_db_dep),
    current_user: User = Depends(get_current_user),
) -> dict[str, str]:
    set_rsvp(db, session_id, current_user, payload.status, payload.transport_note)
    return {"status": "ok"}


@router.post("/sessions/{session_id}/reports", response_model=SessionReportRead)
def post_report(
    session_id: int,
    payload: SessionReportCreate,
    db: Session = Depends(get_db_dep),
    current_user: User = Depends(get_current_user),
) -> SessionReportRead:
    report = create_report(
        db,
        session_id,
        current_user,
        payload.wave_score,
        payload.crowd_score,
        payload.wind_score,
        payload.note,
    )
    return SessionReportRead(
        id=report.id,
        session_id=report.session_id,
        username=current_user.username,
        wave_score=report.wave_score,
        crowd_score=report.crowd_score,
        wind_score=report.wind_score,
        note=report.note,
        created_at=report.created_at,
    )


@router.get("/sessions/{session_id}/reports", response_model=list[SessionReportRead])
def get_reports(
    session_id: int,
    db: Session = Depends(get_db_dep),
    current_user: User = Depends(get_current_user),
) -> list[SessionReportRead]:
    records = list_reports(db, session_id, current_user)
    return [
        SessionReportRead(
            id=report.id,
            session_id=report.session_id,
            username=user.username,
            wave_score=report.wave_score,
            crowd_score=report.crowd_score,
            wind_score=report.wind_score,
            note=report.note,
            created_at=report.created_at,
        )
        for report, user in records
    ]
