import { useEffect, useMemo, useState } from "react";
import { api } from "../shared/api";

interface UserDirectoryItem {
  id: number;
  username: string;
  avatar_url: string | null;
}

interface FriendItem {
  id: number;
  username: string;
  telegram_username: string | null;
}

interface FriendRequestItem {
  id: number;
  from_username: string;
  to_username: string;
  status: string;
  direction: "incoming" | "outgoing";
  created_at: string;
}

interface Props {
  onOpenUser: (username: string) => void;
  hasUnread: boolean;
}

export function FriendsPanel({ onOpenUser, hasUnread }: Props) {
  const [open, setOpen] = useState(false);
  const [users, setUsers] = useState<UserDirectoryItem[]>([]);
  const [friends, setFriends] = useState<FriendItem[]>([]);
  const [pending, setPending] = useState<FriendRequestItem[]>([]);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [resendingId, setResendingId] = useState<number | null>(null);

  const load = async () => {
    const [usersRes, friendsRes, pendingRes] = await Promise.all([
      api.get<UserDirectoryItem[]>("/surf/users"),
      api.get<FriendItem[]>("/surf/friends"),
      api.get<FriendRequestItem[]>("/surf/friends/requests/pending")
    ]);
    setUsers(usersRes.data);
    setFriends(friendsRes.data);
    setPending(pendingRes.data);
  };

  useEffect(() => {
    if (!open) {
      return;
    }
    void load();
  }, [open]);

  const friendUsernames = useMemo(() => new Set(friends.map((item) => item.username)), [friends]);
  const outgoingPendingUsernames = useMemo(
    () =>
      new Set(
        pending
          .filter((item) => item.direction === "outgoing")
          .map((item) => item.to_username)
      ),
    [pending]
  );
  const incomingPending = useMemo(
    () => pending.filter((item) => item.direction === "incoming"),
    [pending]
  );
  const outgoingPending = useMemo(
    () => pending.filter((item) => item.direction === "outgoing"),
    [pending]
  );

  const filteredUsers = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return users.filter((item) => {
      if (friendUsernames.has(item.username) || outgoingPendingUsernames.has(item.username)) {
        return false;
      }
      if (!normalized) {
        return true;
      }
      return item.username.toLowerCase().includes(normalized);
    });
  }, [users, query, friendUsernames, outgoingPendingUsernames]);

  const sendRequest = async (username: string) => {
    try {
      await api.post("/surf/friends/requests", { to_username: username });
      setMessage(`Friend request sent to @${username}`);
      await load();
    } catch (err: any) {
      setMessage(err?.response?.data?.detail ?? "Failed to send friend request");
    }
  };

  const acceptRequest = async (id: number) => {
    try {
      await api.post(`/surf/friends/requests/${id}/accept`);
      setMessage("Friend request accepted");
      await load();
    } catch (err: any) {
      setMessage(err?.response?.data?.detail ?? "Failed to accept friend request");
    }
  };

  const resendRequest = async (id: number, username: string) => {
    try {
      setResendingId(id);
      await api.post(`/surf/friends/requests/${id}/resend`);
      setMessage(`Invite sent again to @${username}`);
      await load();
    } catch (err: any) {
      setMessage(err?.response?.data?.detail ?? "Failed to resend friend request");
    } finally {
      setResendingId(null);
    }
  };

  return (
    <aside className="card surf-sidebar panel-with-dot">
      {hasUnread ? <span className="notify-dot" aria-label="New notifications" /> : null}
      <div className="crew-header">
        <h2>Friends</h2>
        <button
          className="ghost crew-toggle icon-toggle"
          type="button"
          aria-label={open ? "Collapse friends" : "Expand friends"}
          title={open ? "Collapse" : "Expand"}
          onClick={() => setOpen((value) => !value)}
        >
          <span className={`icon-chevron ${open ? "up" : ""}`} aria-hidden="true">
            ˅
          </span>
        </button>
      </div>
      {!open ? null : (
        <>
          <div className="stack-form">
            <label>
              Search users
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="@username"
              />
            </label>
          </div>
          {message ? <p className="tiny">{message}</p> : null}
          <div className="group-list friends-users-list">
            {filteredUsers.map((user) => (
              <button
                key={user.id}
                className="group-item"
                type="button"
                onClick={() => void sendRequest(user.username)}
              >
                <strong>@{user.username}</strong>
                <small>Add friend</small>
              </button>
            ))}
          </div>
          <div className="invite-box">
            <p className="tiny">Pending friend requests</p>
            <div className="group-list pending-friends-list">
              {incomingPending.map((request) => (
                <article key={request.id} className="group-item pending-row">
                  <strong>@{request.from_username} wants to connect</strong>
                  <button type="button" className="ghost" onClick={() => void acceptRequest(request.id)}>
                    Accept
                  </button>
                </article>
              ))}
              {outgoingPending.map((request) => (
                <article key={request.id} className="group-item pending-row">
                  <strong>Waiting for @{request.to_username}</strong>
                  <button
                    type="button"
                    className="ghost"
                    disabled={resendingId === request.id}
                    onClick={() => void resendRequest(request.id, request.to_username)}
                  >
                    {resendingId === request.id ? "Sending..." : "Send invite again"}
                  </button>
                </article>
              ))}
              {pending.length === 0 ? <p className="tiny">No pending requests.</p> : null}
            </div>
          </div>
          <div className="invite-box">
            <p className="tiny">Your friends</p>
            <div className="chip-row">
              {friends.map((friend) => (
                <button
                  key={friend.id}
                  type="button"
                  className="ghost"
                  onClick={() => onOpenUser(friend.username)}
                >
                  @{friend.username}
                </button>
              ))}
              {friends.length === 0 ? <p className="tiny">No friends yet.</p> : null}
            </div>
          </div>
        </>
      )}
    </aside>
  );
}
