import { useEffect, useState } from "react";
import { api } from "../shared/api";

interface GroupDetail {
  id: number;
  name: string;
  description: string;
  current_user_role: "admin" | "member";
  members: { username: string; role: string }[];
  sessions: { id: number; session_date: string; spot_name: string; average_rating: number | null }[];
}

interface Props {
  groupId: number;
  currentUsername: string;
  friends: { id: number; username: string }[];
  onRefreshData: () => Promise<void>;
  onInviteToCrew: (groupId: number, username: string) => Promise<void>;
  onClose: () => void;
  onOpenUser: (username: string) => void;
  onOpenSession: (sessionId: number) => void;
}

export function CrewDetailModal({
  groupId,
  currentUsername,
  friends,
  onRefreshData,
  onInviteToCrew,
  onClose,
  onOpenUser,
  onOpenSession
}: Props) {
  const [detail, setDetail] = useState<GroupDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingDescription, setEditingDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState("");
  const [inviteStatus, setInviteStatus] = useState<string | null>(null);
  const [removingUsername, setRemovingUsername] = useState<string | null>(null);

  const load = async () => {
    try {
      const response = await api.get<GroupDetail>(`/surf/groups/${groupId}/detail`);
      setDetail(response.data);
      setEditingName(response.data.name);
      setEditingDescription(response.data.description ?? "");
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Failed to load crew details");
    }
  };

  useEffect(() => {
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
              {detail.current_user_role === "admin" ? (
                <div className="invite-box">
                  <p className="tiny">Admin controls</p>
                  <div className="stack-form">
                    <label>
                      Crew name
                      <input value={editingName} onChange={(event) => setEditingName(event.target.value)} />
                    </label>
                    <label>
                      Description
                      <textarea
                        value={editingDescription}
                        onChange={(event) => setEditingDescription(event.target.value)}
                      />
                    </label>
                    <button
                      type="button"
                      className="ghost"
                      disabled={saving || editingName.trim().length < 2}
                      onClick={async () => {
                        setSaving(true);
                        setError(null);
                        try {
                          await api.patch(`/surf/groups/${groupId}`, {
                            name: editingName.trim(),
                            description: editingDescription.trim()
                          });
                          await load();
                          await onRefreshData();
                        } catch (err: any) {
                          setError(err?.response?.data?.detail ?? "Failed to update crew");
                        } finally {
                          setSaving(false);
                        }
                      }}
                    >
                      {saving ? "Saving..." : "Save crew"}
                    </button>
                  </div>
                </div>
              ) : null}
              <h4>Members</h4>
              <div className="chip-row">
                {detail.members.map((member) => (
                  <div key={`${member.username}:${member.role}`} className="chip-row">
                    <button
                      className="ghost"
                      type="button"
                      onClick={() => onOpenUser(member.username)}
                    >
                      @{member.username} ({member.role})
                    </button>
                    {detail.current_user_role === "admin" && member.username !== currentUsername ? (
                      <button
                        type="button"
                        className="ghost"
                        disabled={removingUsername === member.username}
                        onClick={async () => {
                          setRemovingUsername(member.username);
                          try {
                            await api.delete(`/surf/groups/${groupId}/members/${member.username}`);
                            await load();
                            await onRefreshData();
                          } catch (err: any) {
                            setError(err?.response?.data?.detail ?? "Failed to remove member");
                          } finally {
                            setRemovingUsername(null);
                          }
                        }}
                      >
                        {removingUsername === member.username ? "Removing..." : "Remove"}
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
              {detail.current_user_role === "admin" ? (
                <div className="invite-box">
                  <p className="tiny">Invite friend to this crew</p>
                  <div className="invite-row">
                    <select value={selectedFriend} onChange={(event) => setSelectedFriend(event.target.value)}>
                      <option value="">Select friend</option>
                      {friends
                        .filter((friend) => !detail.members.some((member) => member.username === friend.username))
                        .map((friend) => (
                          <option key={friend.id} value={friend.username}>
                            @{friend.username}
                          </option>
                        ))}
                    </select>
                    <button
                      type="button"
                      className="ghost"
                      disabled={!selectedFriend}
                      onClick={async () => {
                        try {
                          await onInviteToCrew(groupId, selectedFriend);
                          setInviteStatus("Crew invite sent");
                          setSelectedFriend("");
                          await load();
                        } catch (err: any) {
                          setInviteStatus(err?.response?.data?.detail ?? "Failed to send crew invite");
                        }
                      }}
                    >
                      Send invite
                    </button>
                  </div>
                  {inviteStatus ? <p className="tiny">{inviteStatus}</p> : null}
                </div>
              ) : null}
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
