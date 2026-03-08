import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { AuthPanel } from "../components/AuthPanel";
import { AppHeader } from "../components/AppHeader";
import { CrewDetailModal } from "../components/CrewDetailModal";
import { FriendsPanel } from "../components/FriendsPanel";
import { InboxPanel } from "../components/InboxPanel";
import { ProfilePanel } from "../components/ProfilePanel";
import { SessionDetailModal } from "../components/SessionDetailModal";
import { SurfCalendar } from "../components/SurfCalendar";
import { SurfGroupPanel } from "../components/SurfGroupPanel";
import { SurfSessionComposer } from "../components/SurfSessionComposer";
import { UserProfileModal } from "../components/UserProfileModal";
import { logout, logoutSession } from "../features/auth/authSlice";
import { api } from "../shared/api";
import {
  acceptInvite,
  declineInvite,
  createGroup,
  createInvite,
  createReport,
  createSession,
  completeSession,
  fetchFriends,
  fetchSessionFeedback,
  fetchInbox,
  fetchGroups,
  fetchReports,
  fetchSessionPhotos,
  fetchSessions,
  joinByInvite,
  markInboxRead,
  selectGroup,
  sendSessionInvite,
  uploadSessionPhoto,
  upsertSessionFeedback,
  setRsvp
} from "../features/surf/surfSlice";
import type { ReportCreatePayload, SessionCreatePayload } from "../features/surf/types";

export function DashboardPage() {
  const dispatch = useAppDispatch();
  const { token, username, sessionChecked } = useAppSelector((state) => state.auth);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  const [aboutOpen, setAboutOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [profileModalUsername, setProfileModalUsername] = useState<string | null>(null);
  const [crewModalGroupId, setCrewModalGroupId] = useState<number | null>(null);
  const [sessionDetailId, setSessionDetailId] = useState<number | null>(null);
  const [inboxDetailsOpen, setInboxDetailsOpen] = useState(false);
  const [checkingDots, setCheckingDots] = useState(1);
  const {
    groups,
    friends,
    selectedGroupId,
    sessions,
    reportsBySession,
    feedbackBySession,
    photosBySession,
    invitesByGroup,
    inbox,
    loadingGroups,
    loadingFriends,
    loadingSessions,
    loadingInbox,
    creatingGroup,
    joiningByCode,
    creatingSession,
    creatingInvite,
    sendingSessionInvite,
    acceptingInviteIds,
    decliningInviteIds,
    rsvpLoadingIds,
    reportLoadingIds,
    feedbackLoadingIds,
    feedbackSavingIds,
    completingSessionIds,
    photoLoadingIds,
    photoUploadingIds,
    error
  } = useAppSelector((state) => state.surf);

  useEffect(() => {
    if (!token) {
      return;
    }
    void dispatch(fetchGroups());
    void dispatch(fetchFriends());
  }, [dispatch, token]);

  useEffect(() => {
    if (!selectedGroupId) {
      return;
    }
    void dispatch(fetchSessions(selectedGroupId));
  }, [dispatch, selectedGroupId]);

  useEffect(() => {
    if (!token) {
      return;
    }
    void dispatch(fetchInbox());
  }, [dispatch, token]);

  useEffect(() => {
    if (!token) {
      return;
    }
    const loadAvatar = async () => {
      try {
        const response = await api.get<{ avatar_url: string | null }>("/auth/profile");
        setAvatarUrl(response.data.avatar_url);
      } catch {
        setAvatarUrl(null);
      }
    };
    void loadAvatar();
  }, [token]);

  useEffect(() => {
    if (token || sessionChecked) {
      return;
    }
    const timer = window.setInterval(() => {
      setCheckingDots((current) => (current >= 3 ? 1 : current + 1));
    }, 420);
    return () => window.clearInterval(timer);
  }, [token, sessionChecked]);

  if (!token && !sessionChecked) {
    return (
      <main className="layout auth-layout">
        <section className="card auth-card checking-card">
          <h1>
            Checking session
            <span className="loading-dots" aria-hidden="true">
              {".".repeat(checkingDots)}
            </span>
          </h1>
        </section>
      </main>
    );
  }

  if (!token) {
    return <AuthPanel />;
  }

  const handleCopyInviteLink = async () => {
    const baseUrl = `${window.location.origin}/`;
    try {
      await navigator.clipboard.writeText(baseUrl);
      setCopyState("copied");
    } catch {
      setCopyState("error");
    }
    window.setTimeout(() => setCopyState("idle"), 1800);
  };

  const handleCreateGroup = async (name: string, description: string) => {
    await dispatch(createGroup({ name, description }));
  };

  const handleJoinByCode = async (code: string) => {
    await dispatch(joinByInvite(code));
  };

  const handleCreateSession = async (payload: SessionCreatePayload) => {
    if (!selectedGroupId) {
      return;
    }
    const { invite_usernames = [], invite_telegram_usernames = [], ...sessionPayload } = payload;
    const created = await dispatch(createSession({ groupId: selectedGroupId, payload: sessionPayload }));
    if (!createSession.fulfilled.match(created)) {
      return;
    }

    const sessionId = created.payload.id;
    for (const username of invite_usernames) {
      await dispatch(sendSessionInvite({ sessionId, username }));
    }
    for (const telegram_username of invite_telegram_usernames) {
      await dispatch(sendSessionInvite({ sessionId, telegram_username }));
    }
    if (invite_usernames.length > 0 || invite_telegram_usernames.length > 0) {
      await dispatch(fetchInbox());
    }
  };

  const handleRsvp = async (
    sessionId: number,
    status: "going" | "maybe" | "not_going"
  ) => {
    await dispatch(setRsvp({ sessionId, status }));
  };

  const handleCreateReport = async (sessionId: number, payload: ReportCreatePayload) => {
    await dispatch(createReport({ sessionId, payload }));
  };

  const handleLoadReports = async (sessionId: number) => {
    await dispatch(fetchReports(sessionId));
  };

  const handleCompleteSession = async (sessionId: number) => {
    const result = await dispatch(completeSession(sessionId));
    if (completeSession.fulfilled.match(result) && selectedGroupId) {
      await dispatch(fetchSessions(selectedGroupId));
    }
  };

  const handleLoadFeedback = async (sessionId: number) => {
    await dispatch(fetchSessionFeedback(sessionId));
  };

  const handleSubmitFeedback = async (sessionId: number, stars: number | null, comment: string) => {
    await dispatch(upsertSessionFeedback({ sessionId, stars, comment }));
    if (selectedGroupId) {
      await dispatch(fetchSessions(selectedGroupId));
    }
    await dispatch(fetchSessionFeedback(sessionId));
  };

  const handleLoadPhotos = async (sessionId: number) => {
    await dispatch(fetchSessionPhotos(sessionId));
  };

  const handleUploadPhoto = async (sessionId: number, file: File) => {
    await dispatch(uploadSessionPhoto({ sessionId, file }));
  };

  const handleSendInvite = async (
    sessionId: number,
    username?: string,
    telegramUsername?: string
  ) => {
    await dispatch(
      sendSessionInvite({
        sessionId,
        username,
        telegram_username: telegramUsername
      })
    );
    await dispatch(fetchInbox());
  };

  const handleAcceptInvite = async (inviteId: number) => {
    await dispatch(acceptInvite(inviteId));
    if (selectedGroupId) {
      await dispatch(fetchSessions(selectedGroupId));
    }
    await dispatch(fetchInbox());
  };

  const handleDeclineInvite = async (inviteId: number) => {
    await dispatch(declineInvite(inviteId));
    await dispatch(fetchInbox());
  };

  const handleAcceptFriendRequest = async (requestId: number) => {
    await api.post(`/surf/friends/requests/${requestId}/accept`);
    await dispatch(fetchFriends());
    await dispatch(fetchInbox());
  };

  const handleDeclineFriendRequest = async (requestId: number) => {
    await api.post(`/surf/friends/requests/${requestId}/decline`);
    await dispatch(fetchInbox());
  };

  const handleMarkInboxRead = async (itemId: number) => {
    await dispatch(markInboxRead(itemId));
  };
  const handleInviteToCrew = async (groupId: number, targetUsername: string) => {
    await api.post(`/surf/groups/${groupId}/member-invites`, { username: targetUsername });
    await dispatch(fetchInbox());
  };
  const handleAcceptCrewInvite = async (inviteId: number) => {
    await api.post(`/surf/member-invites/${inviteId}/accept`);
    await dispatch(fetchGroups());
    await dispatch(fetchFriends());
    await dispatch(fetchInbox());
  };
  const handleDeclineCrewInvite = async (inviteId: number) => {
    await api.post(`/surf/member-invites/${inviteId}/decline`);
    await dispatch(fetchInbox());
  };

  const unreadInboxCount = inbox.filter((item) => !item.is_read).length;
  const unreadFriendsCount = inbox.filter(
    (item) => !item.is_read && item.item_type.startsWith("friend_request")
  ).length;

  return (
    <main className="layout">
      <AppHeader />
      <div className="top-control">
        <div className="auth-strip">
          <span>Signed in as @{username}</span>
        </div>
        <div className="control-card">
          <div className="avatar-mini">
            {avatarUrl ? <img src={avatarUrl} alt="Avatar" /> : <span>{username?.[0]?.toUpperCase() ?? "U"}</span>}
          </div>
          <button className="ghost control-about" onClick={() => setAboutOpen(true)}>
            About Me
          </button>
          <button className="ghost control-share" onClick={() => void handleCopyInviteLink()}>
            {copyState === "copied"
              ? "Copied"
              : copyState === "error"
                ? "Copy failed"
                : "Share link"}
          </button>
          <button
            className="ghost control-logout"
            onClick={async () => {
              await dispatch(logoutSession());
              dispatch(logout());
            }}
          >
            Logout
          </button>
        </div>
      </div>
      {error ? <p className="error">{error}</p> : null}
      {aboutOpen ? (
        <div className="modal-backdrop">
          <div className="modal-wrap">
            <ProfilePanel onClose={() => setAboutOpen(false)} onAvatarChange={setAvatarUrl} />
          </div>
        </div>
      ) : null}
      {crewModalGroupId ? (
        <CrewDetailModal
          groupId={crewModalGroupId}
          currentUsername={username ?? ""}
          friends={friends}
          onRefreshData={async () => {
            await dispatch(fetchGroups());
            await dispatch(fetchFriends());
          }}
          onInviteToCrew={handleInviteToCrew}
          onClose={() => setCrewModalGroupId(null)}
          onOpenUser={(usernameValue) => setProfileModalUsername(usernameValue)}
          onOpenSession={(sessionId) => setSessionDetailId(sessionId)}
        />
      ) : null}
      {sessionDetailId ? (
        <SessionDetailModal sessionId={sessionDetailId} onClose={() => setSessionDetailId(null)} />
      ) : null}
      {profileModalUsername ? (
        <UserProfileModal
          username={profileModalUsername}
          adminCrews={groups.filter((group) => group.role === "admin").map((group) => ({ id: group.id, name: group.name }))}
          onInviteToCrew={handleInviteToCrew}
          onClose={() => setProfileModalUsername(null)}
        />
      ) : null}
      {inboxDetailsOpen ? (
        <section className="inbox-page-wrap">
          <InboxPanel
            detailed
            items={inbox}
            loading={loadingInbox}
            acceptingInviteIds={acceptingInviteIds}
            decliningInviteIds={decliningInviteIds}
            hasUnread={unreadInboxCount > 0}
            onRefresh={async () => {
              await dispatch(fetchInbox());
            }}
            onAcceptInvite={handleAcceptInvite}
            onDeclineInvite={handleDeclineInvite}
            onAcceptCrewInvite={handleAcceptCrewInvite}
            onDeclineCrewInvite={handleDeclineCrewInvite}
            onAcceptFriendRequest={handleAcceptFriendRequest}
            onDeclineFriendRequest={handleDeclineFriendRequest}
            onMarkRead={handleMarkInboxRead}
            onOpenUser={(usernameValue) => setProfileModalUsername(usernameValue)}
            onOpenGroup={(groupId) => setCrewModalGroupId(groupId)}
            onOpenSession={(sessionId) => setSessionDetailId(sessionId)}
            onCloseDetailsPage={() => setInboxDetailsOpen(false)}
          />
        </section>
      ) : (
        <section className="surf-layout">
          <div className="sidebar-stack">
            <SurfGroupPanel
              groups={groups}
              selectedGroupId={selectedGroupId}
              invitesByGroup={invitesByGroup}
              creatingGroup={creatingGroup}
              joiningByCode={joiningByCode}
              creatingInvite={creatingInvite}
              onSelectGroup={(id) => dispatch(selectGroup(id))}
              onCreateGroup={handleCreateGroup}
              onJoinByCode={handleJoinByCode}
              onCreateInvite={async (groupId) => {
                await dispatch(createInvite(groupId));
              }}
              onOpenGroupDetail={(groupId) => setCrewModalGroupId(groupId)}
            />
            <FriendsPanel
              onOpenUser={(usernameValue) => setProfileModalUsername(usernameValue)}
              hasUnread={unreadFriendsCount > 0}
            />
            <InboxPanel
              items={inbox}
              loading={loadingInbox}
              acceptingInviteIds={acceptingInviteIds}
              decliningInviteIds={decliningInviteIds}
              hasUnread={unreadInboxCount > 0}
              onRefresh={async () => {
                await dispatch(fetchInbox());
              }}
              onAcceptInvite={handleAcceptInvite}
              onDeclineInvite={handleDeclineInvite}
              onAcceptCrewInvite={handleAcceptCrewInvite}
              onDeclineCrewInvite={handleDeclineCrewInvite}
              onAcceptFriendRequest={handleAcceptFriendRequest}
              onDeclineFriendRequest={handleDeclineFriendRequest}
              onMarkRead={handleMarkInboxRead}
              onOpenUser={(usernameValue) => setProfileModalUsername(usernameValue)}
              onOpenGroup={(groupId) => setCrewModalGroupId(groupId)}
              onOpenSession={(sessionId) => setSessionDetailId(sessionId)}
              onOpenDetailsPage={() => setInboxDetailsOpen(true)}
            />
          </div>

          <section className="surf-main">
            {loadingGroups ? <p className="status">Loading groups...</p> : null}
            {!selectedGroupId ? (
              <article className="card empty-block">
                <h3>No group selected</h3>
                <p>Create or join a group to start planning surf sessions.</p>
              </article>
            ) : (
              <>
                <SurfSessionComposer
                  disabled={creatingSession}
                  friends={friends}
                  loadingFriends={loadingFriends}
                  onSubmit={handleCreateSession}
                />
                <SurfCalendar
                  currentUsername={username ?? ""}
                  sessions={sessions}
                  loading={loadingSessions}
                  rsvpLoadingIds={rsvpLoadingIds}
                  reportLoadingIds={reportLoadingIds}
                  reportsBySession={reportsBySession}
                  feedbackBySession={feedbackBySession}
                  photosBySession={photosBySession}
                  sendingInvite={sendingSessionInvite}
                  feedbackLoadingIds={feedbackLoadingIds}
                  feedbackSavingIds={feedbackSavingIds}
                  completingSessionIds={completingSessionIds}
                  photoLoadingIds={photoLoadingIds}
                  photoUploadingIds={photoUploadingIds}
                  onSendInvite={handleSendInvite}
                  onRsvp={handleRsvp}
                  onCompleteSession={handleCompleteSession}
                  onCreateReport={handleCreateReport}
                  onLoadReports={handleLoadReports}
                  onLoadFeedback={handleLoadFeedback}
                  onSubmitFeedback={handleSubmitFeedback}
                  onLoadPhotos={handleLoadPhotos}
                  onUploadPhoto={handleUploadPhoto}
                />
              </>
            )}
          </section>
        </section>
      )}
    </main>
  );
}
