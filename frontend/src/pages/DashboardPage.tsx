import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { AuthPanel } from "../components/AuthPanel";
import { AppHeader } from "../components/AppHeader";
import { SurfCalendar } from "../components/SurfCalendar";
import { SurfGroupPanel } from "../components/SurfGroupPanel";
import { SurfSessionComposer } from "../components/SurfSessionComposer";
import { logout } from "../features/auth/authSlice";
import {
  createGroup,
  createInvite,
  createReport,
  createSession,
  fetchGroups,
  fetchReports,
  fetchSessions,
  joinByInvite,
  selectGroup,
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
    loadingGroups,
    loadingSessions,
    creatingGroup,
    joiningByCode,
    creatingSession,
    creatingInvite,
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
                onRsvp={handleRsvp}
                onCreateReport={handleCreateReport}
                onLoadReports={handleLoadReports}
              />
            </>
          )}
        </section>
      </section>
    </main>
  );
}
