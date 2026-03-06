import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { AuthPanel } from "../components/AuthPanel";
import { AppHeader } from "../components/AppHeader";
import { InboxPanel } from "../components/InboxPanel";
import { SurfCalendar } from "../components/SurfCalendar";
import { SurfGroupPanel } from "../components/SurfGroupPanel";
import { SurfSessionComposer } from "../components/SurfSessionComposer";
import { logout } from "../features/auth/authSlice";
import {
  acceptInvite,
  createGroup,
  createInvite,
  createReport,
  createSession,
  fetchInbox,
  fetchGroups,
  fetchReports,
  fetchSessions,
  joinByInvite,
  markInboxRead,
  selectGroup,
  sendSessionInvite,
  setRsvp
} from "../features/surf/surfSlice";
import type { ReportCreatePayload, SessionCreatePayload } from "../features/surf/types";

export function DashboardPage() {
  const dispatch = useAppDispatch();
  const { token, username } = useAppSelector((state) => state.auth);
  const {
    groups,
    selectedGroupId,
    sessions,
    reportsBySession,
    invitesByGroup,
    inbox,
    loadingGroups,
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
    error
  } = useAppSelector((state) => state.surf);

  useEffect(() => {
    if (!token) {
      return;
    }
    void dispatch(fetchGroups());
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

  if (!token) {
    return <AuthPanel />;
  }

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
    await dispatch(createSession({ groupId: selectedGroupId, payload }));
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
      <div className="auth-strip">
        <span>Signed in as @{username}</span>
        <button className="ghost" onClick={() => dispatch(logout())}>
          Logout
        </button>
      </div>
      {error ? <p className="error">{error}</p> : null}
      <section className="surf-layout">
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
        />

        <section className="surf-main">
          {loadingGroups ? <p className="status">Loading groups...</p> : null}
          {!selectedGroupId ? (
            <article className="card empty-block">
              <h3>No group selected</h3>
              <p>Create or join a group to start planning surf sessions.</p>
            </article>
          ) : (
            <>
              <SurfSessionComposer disabled={creatingSession} onSubmit={handleCreateSession} />
              <SurfCalendar
                sessions={sessions}
                loading={loadingSessions}
                rsvpLoadingIds={rsvpLoadingIds}
                reportLoadingIds={reportLoadingIds}
                reportsBySession={reportsBySession}
                sendingInvite={sendingSessionInvite}
                onSendInvite={handleSendInvite}
                onRsvp={handleRsvp}
                onCreateReport={handleCreateReport}
                onLoadReports={handleLoadReports}
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
