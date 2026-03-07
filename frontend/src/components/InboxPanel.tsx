import { useState } from "react";
import type { InboxItem } from "../features/surf/types";

interface Props {
  items: InboxItem[];
  loading: boolean;
  acceptingInviteIds: number[];
  decliningInviteIds: number[];
  onRefresh: () => Promise<void>;
  onAcceptInvite: (inviteId: number) => Promise<void>;
  onDeclineInvite: (inviteId: number) => Promise<void>;
  onAcceptFriendRequest: (requestId: number) => Promise<void>;
  onDeclineFriendRequest: (requestId: number) => Promise<void>;
  onMarkRead: (itemId: number) => Promise<void>;
  onOpenUser: (username: string) => void;
  onOpenGroup: (groupId: number) => void;
  onOpenSession: (sessionId: number) => void;
  hasUnread?: boolean;
  detailed?: boolean;
  onOpenDetailsPage?: () => void;
  onCloseDetailsPage?: () => void;
}

export function InboxPanel({
  items,
  loading,
  acceptingInviteIds,
  decliningInviteIds,
  onRefresh,
  onAcceptInvite,
  onDeclineInvite,
  onAcceptFriendRequest,
  onDeclineFriendRequest,
  onMarkRead,
  onOpenUser,
  onOpenGroup,
  onOpenSession,
  hasUnread = false,
  detailed = false,
  onOpenDetailsPage,
  onCloseDetailsPage
}: Props) {
  const [open, setOpen] = useState(false);
  const visibleItems = detailed ? items : items.slice(0, 6);
  const expanded = detailed || open;
  const actionLabel = (status: string): string => {
    if (status === "pending") {
      return "No action yet";
    }
    if (status === "accepted") {
      return "Accepted";
    }
    if (status === "declined") {
      return "Declined";
    }
    return "Info only";
  };

  return (
    <section className="card inbox-panel panel-with-dot">
      {hasUnread ? <span className="notify-dot" aria-label="New notifications" /> : null}
      <div className="inbox-head">
        <h2>{detailed ? "Inbox Details" : "Inbox"}</h2>
        {!detailed ? (
          <button
            className="ghost icon-toggle"
            aria-label={expanded ? "Collapse inbox" : "Expand inbox"}
            title={expanded ? "Collapse" : "Expand"}
            onClick={() => setOpen((value) => !value)}
          >
            <span className={`icon-chevron ${expanded ? "up" : ""}`} aria-hidden="true">
              ˅
            </span>
          </button>
        ) : null}
      </div>
      {(detailed || expanded) ? (
        <div className="inbox-actions-row">
          <button className="ghost" onClick={() => onRefresh()}>
            Refresh
          </button>
          {!detailed && onOpenDetailsPage ? (
            <button className="ghost" onClick={onOpenDetailsPage}>
              Open full inbox
            </button>
          ) : null}
          {detailed && onCloseDetailsPage ? (
            <button className="ghost" onClick={onCloseDetailsPage}>
              Back to dashboard
            </button>
          ) : null}
        </div>
      ) : null}
      {!expanded ? null : (
        <>
      {loading ? <p className="status">Loading inbox...</p> : null}
      <div className="inbox-list">
        {visibleItems.length === 0 ? <p className="tiny">No notifications yet.</p> : null}
        {visibleItems.map((item) => (
          <article key={item.id} className={`inbox-item ${item.is_read ? "read" : ""}`}>
            <h4>{item.title}</h4>
            <p>{item.body}</p>
            {detailed && item.action_status !== "none" ? (
              <p className="tiny inbox-action-status">
                Status: <strong>{actionLabel(item.action_status)}</strong>
              </p>
            ) : null}
            <div className="chip-row">
              {!item.is_read ? (
                <button className="ghost" onClick={() => onMarkRead(item.id)}>
                  Mark read
                </button>
              ) : null}
              {item.related_username ? (
                <button className="ghost" onClick={() => onOpenUser(item.related_username as string)}>
                  Open user
                </button>
              ) : null}
              {item.related_group_id ? (
                <button className="ghost" onClick={() => onOpenGroup(item.related_group_id as number)}>
                  Open crew
                </button>
              ) : null}
              {item.related_session_id ? (
                <button className="ghost" onClick={() => onOpenSession(item.related_session_id as number)}>
                  Session details
                </button>
              ) : null}
              {item.item_type === "friend_request" && item.related_friend_request_id && item.action_required ? (
                <>
                  <button onClick={() => onAcceptFriendRequest(item.related_friend_request_id as number)}>
                    Accept friend
                  </button>
                  <button
                    className="ghost"
                    onClick={() => onDeclineFriendRequest(item.related_friend_request_id as number)}
                  >
                    Decline
                  </button>
                </>
              ) : null}
              {item.item_type === "session_invite" && item.related_invite_id && item.action_required ? (
                <>
                  <button
                    onClick={() => onAcceptInvite(item.related_invite_id as number)}
                    disabled={acceptingInviteIds.includes(item.related_invite_id as number)}
                  >
                    {acceptingInviteIds.includes(item.related_invite_id as number)
                      ? "Accepting..."
                      : "Accept invite"}
                  </button>
                  <button
                    className="ghost"
                    onClick={() => onDeclineInvite(item.related_invite_id as number)}
                    disabled={decliningInviteIds.includes(item.related_invite_id as number)}
                  >
                    {decliningInviteIds.includes(item.related_invite_id as number)
                      ? "Declining..."
                      : "Decline invite"}
                  </button>
                </>
              ) : null}
            </div>
          </article>
        ))}
        {!detailed && items.length > visibleItems.length ? (
          <p className="tiny">Showing {visibleItems.length} latest items. Open full inbox for all notifications.</p>
        ) : null}
      </div>
        </>
      )}
    </section>
  );
}
