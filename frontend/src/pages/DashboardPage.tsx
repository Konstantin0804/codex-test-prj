import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { AuthPanel } from "../components/AuthPanel";
import { AppHeader } from "../components/AppHeader";
import { CrewDetailModal } from "../components/CrewDetailModal";
import { FriendsPanel } from "../components/FriendsPanel";
import { InboxPanel } from "../components/InboxPanel";
import { ProfilePanel } from "../components/ProfilePanel";
import { SurfCalendar } from "../components/SurfCalendar";
import { SurfGroupPanel } from "../components/SurfGroupPanel";
import { SurfSessionComposer } from "../components/SurfSessionComposer";
import { UserProfileModal } from "../components/UserProfileModal";
import { logout } from "../features/auth/authSlice";
import { api } from "../shared/api";
import {
  acceptInvite,
  createGroup,
  createInvite,
  createReport,
  createSession,
  fetchFriends,
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
  setRsvp
} from "../features/surf/surfSlice";
import type { ReportCreatePayload, SessionCreatePayload } from "../features/surf/types";

export function DashboardPage() {
  const dispatch = useAppDispatch();
  const { token, username } = useAppSelector((state) => state.auth);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  const [aboutOpen, setAboutOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [profileModalUsername, setProfileModalUsername] = useState<string | null>(null);
  const [crewModalGroupId, setCrewModalGroupId] = useState<number | null>(null);
  const {
    groups,
    friends,
    selectedGroupId,
    sessions,
    reportsBySession,
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
    rsvpLoadingIds,
    reportLoadingIds,
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

  const handleMarkInboxRead = async (itemId: number) => {
    await dispatch(markInboxRead(itemId));
  };

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
          <button className="ghost" onClick={() => setAboutOpen(true)}>
            About Me
          </button>
          <button className="ghost" onClick={() => void handleCopyInviteLink()}>
            {copyState === "copied"
              ? "Copied"
              : copyState === "error"
                ? "Copy failed"
                : "Share invite link"}
          </button>
          <button className="ghost" onClick={() => dispatch(logout())}>
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
      {profileModalUsername ? (
        <UserProfileModal username={profileModalUsername} onClose={() => setProfileModalUsername(null)} />
      ) : null}
      {crewModalGroupId ? (
        <CrewDetailModal
          groupId={crewModalGroupId}
          onClose={() => setCrewModalGroupId(null)}
          onOpenUser={(usernameValue) => setProfileModalUsername(usernameValue)}
        />
      ) : null}
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
          <FriendsPanel onOpenUser={(usernameValue) => setProfileModalUsername(usernameValue)} />
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
                sessions={sessions}
                loading={loadingSessions}
                rsvpLoadingIds={rsvpLoadingIds}
                reportLoadingIds={reportLoadingIds}
                reportsBySession={reportsBySession}
                photosBySession={photosBySession}
                sendingInvite={sendingSessionInvite}
                photoLoadingIds={photoLoadingIds}
                photoUploadingIds={photoUploadingIds}
                onSendInvite={handleSendInvite}
                onRsvp={handleRsvp}
                onCreateReport={handleCreateReport}
                onLoadReports={handleLoadReports}
                onLoadPhotos={handleLoadPhotos}
                onUploadPhoto={handleUploadPhoto}
              />
              <InboxPanel
                items={inbox}
                loading={loadingInbox}
                acceptingInviteIds={acceptingInviteIds}
                onRefresh={async () => {
                  await dispatch(fetchInbox());
                }}
                onAcceptInvite={handleAcceptInvite}
                onMarkRead={handleMarkInboxRead}
              />
            </>
          )}
        </section>
      </section>
    </main>
  );
}
