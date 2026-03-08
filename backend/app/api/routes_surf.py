from datetime import date, time

from fastapi import APIRouter, Depends, File, UploadFile
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db_dep
from app.models.surf import (
    FriendRequest,
    FriendRequestStatus,
    GroupMemberInvite,
    GroupMemberInviteStatus,
    SessionInvite,
    SessionInviteStatus,
)
from app.models.user import User
from app.schemas.surf import (
    FriendRequestCreate,
    FriendRequestRead,
    FriendRead,
    GroupDetailRead,
    GroupMemberRead,
    GroupMemberInviteCreate,
    GroupMemberInviteRead,
    GroupSessionSummaryRead,
    GroupCreate,
    GroupRead,
    GroupUpdate,
    InboxItemRead,
    InviteRead,
    JoinInvitePayload,
    RSVPUpdate,
    SessionCreate,
    SessionCommentCreate,
    SessionCommentRead,
    SessionFeedbackCreate,
    SessionFeedbackRead,
    SessionInviteCreate,
    SessionInviteRead,
    SessionInviteStatusRead,
    SessionDetailRead,
    SessionForecastSnapshotRead,
    SessionPhotoRead,
    SessionRead,
    SessionReportCreate,
    SessionReportRead,
    SpotForecastRead,
    UserDirectoryRead,
)
from app.services.forecast_service import get_open_meteo_forecast
from app.services.surf_service import (
    accept_friend_request,
    accept_group_member_invite,
    complete_session,
    accept_session_invite,
    create_friend_request,
    create_group,
    create_group_member_invite,
    create_invite,
    create_report,
    create_session_invite,
    create_session,
    create_session_comment,
    upsert_session_feedback,
    get_group_detail,
    get_session_detail,
    join_by_code,
    list_incoming_friend_requests,
    list_pending_friend_requests,
    list_registered_users,
    list_friends,
    list_inbox_items,
    list_groups,
    list_reports,
    list_session_comments,
    list_session_photos,
    list_session_feedback,
    list_sessions,
    mark_inbox_read,
    my_rsvp_map,
    remove_group_member,
    resend_friend_request,
    update_group,
    decline_friend_request,
    decline_group_member_invite,
    decline_session_invite,
    session_rating_summary_map,
    add_session_photo,
    set_rsvp,
)

router = APIRouter(prefix="/surf", tags=["surf"])


def _session_forecast_snapshot(session) -> SessionForecastSnapshotRead | None:
    if (
        session.forecast_provider is None
        and session.forecast_target_time is None
        and session.forecast_summary is None
        and session.forecast_wave_height_m is None
        and session.forecast_wind_speed_kmh is None
    ):
        return None
    return SessionForecastSnapshotRead(
        provider=session.forecast_provider,
        target_time=session.forecast_target_time,
        wave_height_m=session.forecast_wave_height_m,
        wave_direction_deg=session.forecast_wave_direction_deg,
        wave_direction_cardinal=session.forecast_wave_direction_cardinal,
        wave_period_s=session.forecast_wave_period_s,
        wind_speed_kmh=session.forecast_wind_speed_kmh,
        wind_direction_deg=session.forecast_wind_direction_deg,
        wind_direction_cardinal=session.forecast_wind_direction_cardinal,
        water_temperature_c=session.forecast_water_temperature_c,
        sea_level_m=session.forecast_sea_level_m,
        tide_level=session.forecast_tide_level,
        tide_trend=session.forecast_tide_trend,
        summary=session.forecast_summary,
    )


def _resolve_inbox_action_state(db: Session, item, current_user: User) -> tuple[str, bool]:
    if item.related_friend_request_id:
        request = db.get(FriendRequest, item.related_friend_request_id)
        if not request:
            return "none", False
        if request.to_user_id != current_user.id:
            return request.status.value, False
        if request.status == FriendRequestStatus.pending:
            return "pending", True
        return request.status.value, False

    if item.related_invite_id:
        invite = db.get(SessionInvite, item.related_invite_id)
        if not invite:
            return "none", False
        is_target = (
            (invite.invited_user_id == current_user.id)
            or (
                invite.invited_user_id is None
                and bool(invite.invited_telegram_username)
                and invite.invited_telegram_username == current_user.telegram_username
            )
        )
        status_value = invite.status.value
        if not is_target:
            return status_value, False
        if invite.status in [SessionInviteStatus.pending, SessionInviteStatus.pending_verification]:
            return "pending", True
        if invite.status == SessionInviteStatus.accepted:
            return "accepted", False
        if invite.status == SessionInviteStatus.declined:
            return "declined", False
        return status_value, False

    if item.related_group_member_invite_id:
        invite = db.get(GroupMemberInvite, item.related_group_member_invite_id)
        if not invite:
            return "none", False
        if invite.invited_user_id != current_user.id:
            return invite.status.value, False
        if invite.status == GroupMemberInviteStatus.pending:
            return "pending", True
        return invite.status.value, False

    return "none", False


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


@router.patch("/groups/{group_id}", response_model=GroupRead)
def patch_group(
    group_id: int,
    payload: GroupUpdate,
    db: Session = Depends(get_db_dep),
    current_user: User = Depends(get_current_user),
) -> GroupRead:
    group = update_group(db, group_id, current_user, name=payload.name, description=payload.description)
    return GroupRead(
        id=group.id,
        name=group.name,
        description=group.description,
        role="admin",
        created_at=group.created_at,
    )


@router.delete("/groups/{group_id}/members/{username}")
def delete_group_member(
    group_id: int,
    username: str,
    db: Session = Depends(get_db_dep),
    current_user: User = Depends(get_current_user),
) -> dict[str, str]:
    remove_group_member(db, group_id, current_user, username)
    return {"status": "ok"}


@router.post("/groups/{group_id}/member-invites", response_model=GroupMemberInviteRead)
def post_group_member_invite(
    group_id: int,
    payload: GroupMemberInviteCreate,
    db: Session = Depends(get_db_dep),
    current_user: User = Depends(get_current_user),
) -> GroupMemberInviteRead:
    invite = create_group_member_invite(db, group_id, current_user, payload.username)
    invited_user = db.get(User, invite.invited_user_id)
    invited_by = db.get(User, invite.invited_by_user_id)
    return GroupMemberInviteRead(
        id=invite.id,
        group_id=invite.group_id,
        invited_username=invited_user.username if invited_user else "",
        invited_by_username=invited_by.username if invited_by else "",
        status=invite.status,
        created_at=invite.created_at,
        acted_at=invite.acted_at,
    )


@router.post("/member-invites/{invite_id}/accept", response_model=GroupMemberInviteRead)
def post_accept_group_member_invite(
    invite_id: int,
    db: Session = Depends(get_db_dep),
    current_user: User = Depends(get_current_user),
) -> GroupMemberInviteRead:
    invite = accept_group_member_invite(db, invite_id, current_user)
    invited_user = db.get(User, invite.invited_user_id)
    invited_by = db.get(User, invite.invited_by_user_id)
    return GroupMemberInviteRead(
        id=invite.id,
        group_id=invite.group_id,
        invited_username=invited_user.username if invited_user else "",
        invited_by_username=invited_by.username if invited_by else "",
        status=invite.status,
        created_at=invite.created_at,
        acted_at=invite.acted_at,
    )


@router.post("/member-invites/{invite_id}/decline", response_model=GroupMemberInviteRead)
def post_decline_group_member_invite(
    invite_id: int,
    db: Session = Depends(get_db_dep),
    current_user: User = Depends(get_current_user),
) -> GroupMemberInviteRead:
    invite = decline_group_member_invite(db, invite_id, current_user)
    invited_user = db.get(User, invite.invited_user_id)
    invited_by = db.get(User, invite.invited_by_user_id)
    return GroupMemberInviteRead(
        id=invite.id,
        group_id=invite.group_id,
        invited_username=invited_user.username if invited_user else "",
        invited_by_username=invited_by.username if invited_by else "",
        status=invite.status,
        created_at=invite.created_at,
        acted_at=invite.acted_at,
    )


@router.get("/forecast/open-meteo", response_model=SpotForecastRead)
def get_open_meteo_spot_forecast(
    spot_name: str,
    session_date: date,
    meeting_time: time | None = None,
) -> SpotForecastRead:
    payload = get_open_meteo_forecast(
        spot_name=spot_name.strip(),
        session_date=session_date,
        meeting_time=meeting_time,
    )
    return SpotForecastRead(**payload)


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


@router.get("/friends", response_model=list[FriendRead])
def get_friends(
    db: Session = Depends(get_db_dep),
    current_user: User = Depends(get_current_user),
) -> list[FriendRead]:
    friends = list_friends(db, current_user)
    return [
        FriendRead(id=friend.id, username=friend.username, telegram_username=friend.telegram_username)
        for friend in friends
    ]


@router.get("/users", response_model=list[UserDirectoryRead])
def get_users(
    db: Session = Depends(get_db_dep),
    current_user: User = Depends(get_current_user),
) -> list[UserDirectoryRead]:
    users = list_registered_users(db, current_user)
    return [UserDirectoryRead(id=item.id, username=item.username, avatar_url=item.avatar_url) for item in users]


@router.post("/friends/requests", response_model=FriendRequestRead)
def post_friend_request(
    payload: FriendRequestCreate,
    db: Session = Depends(get_db_dep),
    current_user: User = Depends(get_current_user),
) -> FriendRequestRead:
    request = create_friend_request(db, current_user, payload.to_username)
    from_user = db.get(User, request.from_user_id)
    to_user = db.get(User, request.to_user_id)
    return FriendRequestRead(
        id=request.id,
        from_username=from_user.username if from_user else "",
        to_username=to_user.username if to_user else "",
        status=request.status,
        direction="outgoing",
        created_at=request.created_at,
    )


@router.get("/friends/requests/incoming", response_model=list[FriendRequestRead])
def get_incoming_friend_requests(
    db: Session = Depends(get_db_dep),
    current_user: User = Depends(get_current_user),
) -> list[FriendRequestRead]:
    requests = list_incoming_friend_requests(db, current_user)
    rows: list[FriendRequestRead] = []
    for request in requests:
        from_user = db.get(User, request.from_user_id)
        to_user = db.get(User, request.to_user_id)
        rows.append(
            FriendRequestRead(
                id=request.id,
                from_username=from_user.username if from_user else "",
                to_username=to_user.username if to_user else "",
                status=request.status,
                direction="incoming",
                created_at=request.created_at,
            )
        )
    return rows


@router.get("/friends/requests/pending", response_model=list[FriendRequestRead])
def get_pending_friend_requests(
    db: Session = Depends(get_db_dep),
    current_user: User = Depends(get_current_user),
) -> list[FriendRequestRead]:
    requests = list_pending_friend_requests(db, current_user)
    rows: list[FriendRequestRead] = []
    for request in requests:
        from_user = db.get(User, request.from_user_id)
        to_user = db.get(User, request.to_user_id)
        rows.append(
            FriendRequestRead(
                id=request.id,
                from_username=from_user.username if from_user else "",
                to_username=to_user.username if to_user else "",
                status=request.status,
                direction="incoming" if request.to_user_id == current_user.id else "outgoing",
                created_at=request.created_at,
            )
        )
    return rows


@router.post("/friends/requests/{request_id}/accept", response_model=FriendRequestRead)
def post_accept_friend_request(
    request_id: int,
    db: Session = Depends(get_db_dep),
    current_user: User = Depends(get_current_user),
) -> FriendRequestRead:
    request = accept_friend_request(db, request_id, current_user)
    from_user = db.get(User, request.from_user_id)
    to_user = db.get(User, request.to_user_id)
    return FriendRequestRead(
        id=request.id,
        from_username=from_user.username if from_user else "",
        to_username=to_user.username if to_user else "",
        status=request.status,
        direction="incoming",
        created_at=request.created_at,
    )


@router.post("/friends/requests/{request_id}/resend", response_model=FriendRequestRead)
def post_resend_friend_request(
    request_id: int,
    db: Session = Depends(get_db_dep),
    current_user: User = Depends(get_current_user),
) -> FriendRequestRead:
    request = resend_friend_request(db, request_id, current_user)
    from_user = db.get(User, request.from_user_id)
    to_user = db.get(User, request.to_user_id)
    return FriendRequestRead(
        id=request.id,
        from_username=from_user.username if from_user else "",
        to_username=to_user.username if to_user else "",
        status=request.status,
        direction="outgoing",
        created_at=request.created_at,
    )


@router.post("/friends/requests/{request_id}/decline", response_model=FriendRequestRead)
def post_decline_friend_request(
    request_id: int,
    db: Session = Depends(get_db_dep),
    current_user: User = Depends(get_current_user),
) -> FriendRequestRead:
    request = decline_friend_request(db, request_id, current_user)
    from_user = db.get(User, request.from_user_id)
    to_user = db.get(User, request.to_user_id)
    return FriendRequestRead(
        id=request.id,
        from_username=from_user.username if from_user else "",
        to_username=to_user.username if to_user else "",
        status=request.status,
        direction="incoming",
        created_at=request.created_at,
    )


@router.get("/groups/{group_id}/detail", response_model=GroupDetailRead)
def get_group_detail_route(
    group_id: int,
    db: Session = Depends(get_db_dep),
    current_user: User = Depends(get_current_user),
) -> GroupDetailRead:
    group, current_membership, members, sessions = get_group_detail(db, group_id, current_user)
    ratings = session_rating_summary_map(db, [item.id for item in sessions])
    return GroupDetailRead(
        id=group.id,
        name=group.name,
        description=group.description,
        current_user_role=current_membership.role,
        members=[GroupMemberRead(username=user.username, role=membership.role) for user, membership in members],
        sessions=[
            GroupSessionSummaryRead(
                id=session.id,
                session_date=session.session_date,
                spot_name=session.spot_name,
                average_rating=ratings.get(session.id, (None, 0))[0],
            )
            for session in sessions
        ],
    )


@router.get("/sessions/{session_id}/detail", response_model=SessionDetailRead)
def get_session_detail_route(
    session_id: int,
    db: Session = Depends(get_db_dep),
    current_user: User = Depends(get_current_user),
) -> SessionDetailRead:
    session, owner, invites, photos = get_session_detail(db, session_id, current_user)
    avg, count = session_rating_summary_map(db, [session.id]).get(session.id, (None, 0))

    participant_usernames = {owner.username}
    invite_rows: list[SessionInviteStatusRead] = []
    for invite, invited_by, invited_user in invites:
        if invite.status.value == "accepted" and invited_user:
            participant_usernames.add(invited_user.username)
        invite_rows.append(
            SessionInviteStatusRead(
                id=invite.id,
                invited_username=invited_user.username if invited_user else None,
                invited_telegram_username=invite.invited_telegram_username,
                status=invite.status,
                invited_by_username=invited_by.username,
                accepted_at=invite.accepted_at,
            )
        )

    photo_rows = [
        SessionPhotoRead(
            id=photo.id,
            session_id=photo.session_id,
            uploaded_by_username=photo_user.username,
            public_url=photo.public_url,
            content_type=photo.content_type,
            file_size_bytes=photo.file_size_bytes,
            created_at=photo.created_at,
        )
        for photo, photo_user in photos
    ]

    return SessionDetailRead(
        id=session.id,
        group_id=session.group_id,
        spot_name=session.spot_name,
        session_date=session.session_date,
        meeting_time=session.meeting_time,
        level=session.level,
        forecast_note=session.forecast_note,
        logistics_note=session.logistics_note,
        created_at=session.created_at,
        created_by_username=owner.username,
        is_completed=session.completed_at is not None,
        completed_at=session.completed_at,
        average_rating=avg,
        rating_count=count,
        forecast_snapshot=_session_forecast_snapshot(session),
        participants=sorted(participant_usernames),
        invites=invite_rows,
        photos=photo_rows,
    )


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
    my_rsvp = my_rsvp_map(db, [session.id], current_user.id).get(session.id)
    avg, count = session_rating_summary_map(db, [session.id]).get(session.id, (None, 0))
    return SessionRead(
        id=session.id,
        group_id=session.group_id,
        spot_name=session.spot_name,
        session_date=session.session_date,
        meeting_time=session.meeting_time,
        level=session.level,
        forecast_note=session.forecast_note,
        logistics_note=session.logistics_note,
        created_at=session.created_at,
        my_rsvp=my_rsvp,
        is_completed=session.completed_at is not None,
        completed_at=session.completed_at,
        can_complete=session.created_by == current_user.id,
        average_rating=avg,
        rating_count=count,
        forecast_snapshot=_session_forecast_snapshot(session),
    )


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
    ratings = session_rating_summary_map(db, [item.id for item in sessions])
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
            is_completed=item.completed_at is not None,
            completed_at=item.completed_at,
            can_complete=item.created_by == current_user.id,
            average_rating=ratings.get(item.id, (None, 0))[0],
            rating_count=ratings.get(item.id, (None, 0))[1],
            forecast_snapshot=_session_forecast_snapshot(item),
        )
        for item in sessions
    ]


@router.post("/sessions/{session_id}/complete", response_model=SessionRead)
def post_complete_session(
    session_id: int,
    db: Session = Depends(get_db_dep),
    current_user: User = Depends(get_current_user),
) -> SessionRead:
    session = complete_session(db, session_id, current_user)
    ratings = session_rating_summary_map(db, [session.id]).get(session.id, (None, 0))
    my_rsvp = my_rsvp_map(db, [session.id], current_user.id).get(session.id)
    return SessionRead(
        id=session.id,
        group_id=session.group_id,
        spot_name=session.spot_name,
        session_date=session.session_date,
        meeting_time=session.meeting_time,
        level=session.level,
        forecast_note=session.forecast_note,
        logistics_note=session.logistics_note,
        created_at=session.created_at,
        my_rsvp=my_rsvp,
        is_completed=session.completed_at is not None,
        completed_at=session.completed_at,
        can_complete=session.created_by == current_user.id,
        average_rating=ratings[0],
        rating_count=ratings[1],
        forecast_snapshot=_session_forecast_snapshot(session),
    )


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


@router.post("/sessions/{session_id}/feedback", response_model=SessionFeedbackRead)
def post_session_feedback(
    session_id: int,
    payload: SessionFeedbackCreate,
    db: Session = Depends(get_db_dep),
    current_user: User = Depends(get_current_user),
) -> SessionFeedbackRead:
    row = upsert_session_feedback(db, session_id, current_user, payload.stars, payload.comment)
    return SessionFeedbackRead(
        id=row.id,
        session_id=row.session_id,
        username=current_user.username,
        stars=row.stars,
        comment=row.comment,
        updated_at=row.updated_at,
    )


@router.get("/sessions/{session_id}/feedback", response_model=list[SessionFeedbackRead])
def get_session_feedback_route(
    session_id: int,
    db: Session = Depends(get_db_dep),
    current_user: User = Depends(get_current_user),
) -> list[SessionFeedbackRead]:
    rows = list_session_feedback(db, session_id, current_user)
    return [
        SessionFeedbackRead(
            id=feedback.id,
            session_id=feedback.session_id,
            username=user.username,
            stars=feedback.stars,
            comment=feedback.comment,
            updated_at=feedback.updated_at,
        )
        for feedback, user in rows
    ]


@router.post("/sessions/{session_id}/comments", response_model=SessionCommentRead)
def post_session_comment(
    session_id: int,
    payload: SessionCommentCreate,
    db: Session = Depends(get_db_dep),
    current_user: User = Depends(get_current_user),
) -> SessionCommentRead:
    row = create_session_comment(db, session_id, current_user, payload.body)
    return SessionCommentRead(
        id=row.id,
        session_id=row.session_id,
        username=current_user.username,
        body=row.body,
        created_at=row.created_at,
    )


@router.get("/sessions/{session_id}/comments", response_model=list[SessionCommentRead])
def get_session_comments_route(
    session_id: int,
    db: Session = Depends(get_db_dep),
    current_user: User = Depends(get_current_user),
) -> list[SessionCommentRead]:
    rows = list_session_comments(db, session_id, current_user)
    return [
        SessionCommentRead(
            id=comment.id,
            session_id=comment.session_id,
            username=user.username,
            body=comment.body,
            created_at=comment.created_at,
        )
        for comment, user in rows
    ]


@router.get("/sessions/{session_id}/photos", response_model=list[SessionPhotoRead])
def get_session_photos(
    session_id: int,
    db: Session = Depends(get_db_dep),
    current_user: User = Depends(get_current_user),
) -> list[SessionPhotoRead]:
    rows = list_session_photos(db, session_id, current_user)
    return [
        SessionPhotoRead(
            id=photo.id,
            session_id=photo.session_id,
            uploaded_by_username=user.username,
            public_url=photo.public_url,
            content_type=photo.content_type,
            file_size_bytes=photo.file_size_bytes,
            created_at=photo.created_at,
        )
        for photo, user in rows
    ]


@router.post("/sessions/{session_id}/photos", response_model=SessionPhotoRead)
async def post_session_photo(
    session_id: int,
    photo: UploadFile = File(...),
    db: Session = Depends(get_db_dep),
    current_user: User = Depends(get_current_user),
) -> SessionPhotoRead:
    data = await photo.read()
    uploaded = add_session_photo(
        db,
        session_id=session_id,
        user=current_user,
        content_type=photo.content_type or "application/octet-stream",
        data=data,
    )
    return SessionPhotoRead(
        id=uploaded.id,
        session_id=uploaded.session_id,
        uploaded_by_username=current_user.username,
        public_url=uploaded.public_url,
        content_type=uploaded.content_type,
        file_size_bytes=uploaded.file_size_bytes,
        created_at=uploaded.created_at,
    )


@router.post("/sessions/{session_id}/invite", response_model=SessionInviteRead)
def post_session_invite(
    session_id: int,
    payload: SessionInviteCreate,
    db: Session = Depends(get_db_dep),
    current_user: User = Depends(get_current_user),
) -> SessionInviteRead:
    invite = create_session_invite(
        db,
        session_id,
        current_user,
        payload.username.strip().lower() if payload.username else None,
        payload.telegram_username,
    )
    invited_username = None
    if invite.invited_user_id:
        user = db.get(User, invite.invited_user_id)
        invited_username = user.username if user else None
    return SessionInviteRead(
        id=invite.id,
        session_id=invite.session_id,
        status=invite.status,
        invited_username=invited_username,
        invited_telegram_username=invite.invited_telegram_username,
        invite_token=invite.invite_token,
        created_at=invite.created_at,
    )


@router.post("/invites/{invite_id}/accept", response_model=SessionInviteRead)
def post_accept_invite(
    invite_id: int,
    db: Session = Depends(get_db_dep),
    current_user: User = Depends(get_current_user),
) -> SessionInviteRead:
    invite = accept_session_invite(db, invite_id, current_user)
    invited_username = None
    if invite.invited_user_id:
        user = db.get(User, invite.invited_user_id)
        invited_username = user.username if user else None
    return SessionInviteRead(
        id=invite.id,
        session_id=invite.session_id,
        status=invite.status,
        invited_username=invited_username,
        invited_telegram_username=invite.invited_telegram_username,
        invite_token=invite.invite_token,
        created_at=invite.created_at,
    )


@router.post("/invites/{invite_id}/decline", response_model=SessionInviteRead)
def post_decline_invite(
    invite_id: int,
    db: Session = Depends(get_db_dep),
    current_user: User = Depends(get_current_user),
) -> SessionInviteRead:
    invite = decline_session_invite(db, invite_id, current_user)
    invited_username = None
    if invite.invited_user_id:
        user = db.get(User, invite.invited_user_id)
        invited_username = user.username if user else None
    return SessionInviteRead(
        id=invite.id,
        session_id=invite.session_id,
        status=invite.status,
        invited_username=invited_username,
        invited_telegram_username=invite.invited_telegram_username,
        invite_token=invite.invite_token,
        created_at=invite.created_at,
    )


@router.get("/inbox", response_model=list[InboxItemRead])
def get_inbox(
    db: Session = Depends(get_db_dep),
    current_user: User = Depends(get_current_user),
) -> list[InboxItemRead]:
    items = list_inbox_items(db, current_user)
    rows: list[InboxItemRead] = []
    for item in items:
        related_username = None
        if item.related_user_id:
            related_user = db.get(User, item.related_user_id)
            related_username = related_user.username if related_user else None
        action_status, action_required = _resolve_inbox_action_state(db, item, current_user)
        rows.append(
            InboxItemRead(
                id=item.id,
                item_type=item.item_type,
                title=item.title,
                body=item.body,
                is_read=item.is_read,
                related_invite_id=item.related_invite_id,
                related_friend_request_id=item.related_friend_request_id,
                related_group_member_invite_id=item.related_group_member_invite_id,
                related_group_id=item.related_group_id,
                related_session_id=item.related_session_id,
                related_user_id=item.related_user_id,
                related_username=related_username,
                action_status=action_status,
                action_required=action_required,
                created_at=item.created_at,
            )
        )
    return rows


@router.patch("/inbox/{item_id}/read", response_model=InboxItemRead)
def patch_inbox_read(
    item_id: int,
    db: Session = Depends(get_db_dep),
    current_user: User = Depends(get_current_user),
) -> InboxItemRead:
    item = mark_inbox_read(db, item_id, current_user)
    related_username = None
    if item.related_user_id:
        related_user = db.get(User, item.related_user_id)
        related_username = related_user.username if related_user else None
    action_status, action_required = _resolve_inbox_action_state(db, item, current_user)
    return InboxItemRead(
        id=item.id,
        item_type=item.item_type,
        title=item.title,
        body=item.body,
        is_read=item.is_read,
        related_invite_id=item.related_invite_id,
        related_friend_request_id=item.related_friend_request_id,
        related_group_member_invite_id=item.related_group_member_invite_id,
        related_group_id=item.related_group_id,
        related_session_id=item.related_session_id,
        related_user_id=item.related_user_id,
        related_username=related_username,
        action_status=action_status,
        action_required=action_required,
        created_at=item.created_at,
    )
