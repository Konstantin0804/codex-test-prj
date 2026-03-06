import type { InboxItem } from "../features/surf/types";

interface Props {
  items: InboxItem[];
  loading: boolean;
  acceptingInviteIds: number[];
  onRefresh: () => Promise<void>;
  onAcceptInvite: (inviteId: number) => Promise<void>;
  onMarkRead: (itemId: number) => Promise<void>;
}

export function InboxPanel({
  items,
  loading,
  acceptingInviteIds,
  onRefresh,
  onAcceptInvite,
  onMarkRead
}: Props) {
  return (
    <section className="card inbox-panel">
      <div className="inbox-head">
        <h2>Inbox</h2>
        <button className="ghost" onClick={() => onRefresh()}>
          Refresh
        </button>
      </div>
      {loading ? <p className="status">Loading inbox...</p> : null}
      <div className="inbox-list">
        {items.length === 0 ? <p className="tiny">No notifications yet.</p> : null}
        {items.map((item) => (
          <article key={item.id} className={`inbox-item ${item.is_read ? "read" : ""}`}>
            <h4>{item.title}</h4>
            <p>{item.body}</p>
            <div className="chip-row">
              {!item.is_read ? (
                <button className="ghost" onClick={() => onMarkRead(item.id)}>
                  Mark read
                </button>
              ) : null}
              {item.item_type === "session_invite" && item.related_invite_id ? (
                <button
                  onClick={() => onAcceptInvite(item.related_invite_id as number)}
                  disabled={acceptingInviteIds.includes(item.related_invite_id as number)}
                >
                  {acceptingInviteIds.includes(item.related_invite_id as number)
                    ? "Accepting..."
                    : "Accept invite"}
                </button>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
