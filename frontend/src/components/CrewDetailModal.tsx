import { useEffect, useState } from "react";
import { api } from "../shared/api";

interface GroupDetail {
  id: number;
  name: string;
  description: string;
  members: { username: string; role: string }[];
  sessions: { id: number; session_date: string; spot_name: string; average_rating: number | null }[];
}

interface Props {
  groupId: number;
  onClose: () => void;
  onOpenUser: (username: string) => void;
  onOpenSession: (sessionId: number) => void;
}

export function CrewDetailModal({ groupId, onClose, onOpenUser, onOpenSession }: Props) {
  const [detail, setDetail] = useState<GroupDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await api.get<GroupDetail>(`/surf/groups/${groupId}/detail`);
        setDetail(response.data);
      } catch (err: any) {
        setError(err?.response?.data?.detail ?? "Failed to load crew details");
      }
    };
    void load();
  }, [groupId]);

  return (
    <div className="modal-backdrop">
      <div className="modal-wrap">
        <section className="card profile-panel">
          <div className="profile-head">
            <h2>Crew Details</h2>
            <button className="ghost" type="button" onClick={onClose}>
              X
            </button>
          </div>
          {error ? <p className="error">{error}</p> : null}
          {!detail ? <p className="tiny">Loading...</p> : null}
          {detail ? (
            <div className="profile-readonly">
              <p>
                <strong>{detail.name}</strong>
              </p>
              <p className="tiny">{detail.description || "No description"}</p>
              <h4>Members</h4>
              <div className="chip-row">
                {detail.members.map((member) => (
                  <button
                    key={`${member.username}:${member.role}`}
                    className="ghost"
                    type="button"
                    onClick={() => onOpenUser(member.username)}
                  >
                    @{member.username} ({member.role})
                  </button>
                ))}
              </div>
              <h4>Session History</h4>
              <div className="group-list crew-sessions-list">
                {detail.sessions.map((session) => (
                  <button
                    key={session.id}
                    className="group-item"
                    type="button"
                    onClick={() => onOpenSession(session.id)}
                  >
                    <strong>{session.session_date} · {session.spot_name}</strong>
                    <small>{session.average_rating !== null ? `${session.average_rating.toFixed(1)}⭐` : "—"}</small>
                  </button>
                ))}
                {detail.sessions.length === 0 ? <p className="tiny">No sessions yet.</p> : null}
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
