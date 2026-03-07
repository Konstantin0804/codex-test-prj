import { FormEvent, useState } from "react";
import type { FriendSummary, SessionLevel } from "../features/surf/types";

interface Props {
  disabled: boolean;
  friends: FriendSummary[];
  loadingFriends: boolean;
  onSubmit: (payload: {
    spot_name: string;
    session_date: string;
    meeting_time: string | null;
    level: SessionLevel;
    forecast_note: string;
    logistics_note: string;
    invite_usernames?: string[];
    invite_telegram_usernames?: string[];
  }) => Promise<void>;
}

export function SurfSessionComposer({ disabled, friends, loadingFriends, onSubmit }: Props) {
  const [spotName, setSpotName] = useState("");
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().slice(0, 10));
  const [meetingTime, setMeetingTime] = useState("06:30");
  const [level, setLevel] = useState<SessionLevel>("mixed");
  const [forecastNote, setForecastNote] = useState("");
  const [logisticsNote, setLogisticsNote] = useState("");
  const [selectedFriendUsernames, setSelectedFriendUsernames] = useState<string[]>([]);
  const [inviteUsersRaw, setInviteUsersRaw] = useState("");
  const [inviteTelegramsRaw, setInviteTelegramsRaw] = useState("");

  const typedUsernames = inviteUsersRaw
    .split(",")
    .map((value) => value.trim().replace(/^@/, "").toLowerCase())
    .filter(Boolean);
  const typedTelegrams = inviteTelegramsRaw
    .split(",")
    .map((value) => value.trim().replace(/^@/, "").toLowerCase())
    .filter(Boolean);
  const finalInviteUsernames = Array.from(new Set([...typedUsernames, ...selectedFriendUsernames]));
  const previewUsers = finalInviteUsernames.map((username) => `@${username}`);
  const previewTelegrams = typedTelegrams.map((username) => `@${username}`);
  const isSpotValid = spotName.trim().length >= 2;
  const isDateValid = Boolean(sessionDate);
  const isTimeValid = Boolean(meetingTime);
  const isSubmitValid = isSpotValid && isDateValid && isTimeValid;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!spotName.trim()) {
      return;
    }
    await onSubmit({
      spot_name: spotName.trim(),
      session_date: sessionDate,
      meeting_time: meetingTime || null,
      level,
      forecast_note: forecastNote,
      logistics_note: logisticsNote,
      invite_usernames: finalInviteUsernames,
      invite_telegram_usernames: typedTelegrams
    });
    setSpotName("");
    setForecastNote("");
    setLogisticsNote("");
    setSelectedFriendUsernames([]);
    setInviteUsersRaw("");
    setInviteTelegramsRaw("");
  };

  const toggleFriend = (username: string) => {
    setSelectedFriendUsernames((prev) =>
      prev.includes(username) ? prev.filter((item) => item !== username) : [...prev, username]
    );
  };

  return (
    <form className="card surf-composer" onSubmit={submit}>
      <h2>Plan Session</h2>
      <label>
        Spot *
        <input value={spotName} onChange={(event) => setSpotName(event.target.value)} />
      </label>
      {spotName.trim().length > 0 && !isSpotValid ? (
        <p className="tiny error-text">Minimum 2 characters.</p>
      ) : null}
      <div className="row-3">
        <label>
          Date *
          <input
            type="date"
            value={sessionDate}
            onChange={(event) => setSessionDate(event.target.value)}
          />
        </label>
        <label>
          Meet Time *
          <input
            type="time"
            value={meetingTime}
            onChange={(event) => setMeetingTime(event.target.value)}
          />
        </label>
        <label>
          Level
          <select value={level} onChange={(event) => setLevel(event.target.value as SessionLevel)}>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
            <option value="mixed">Mixed</option>
          </select>
        </label>
      </div>
      {!isDateValid ? <p className="tiny error-text">Date is required.</p> : null}
      {!isTimeValid ? <p className="tiny error-text">Meet time is required.</p> : null}
      <label>
        Forecast Note
        <textarea
          value={forecastNote}
          onChange={(event) => setForecastNote(event.target.value)}
          placeholder="2-3ft, offshore till 9am"
        />
      </label>
      <label>
        Logistics
        <textarea
          value={logisticsNote}
          onChange={(event) => setLogisticsNote(event.target.value)}
          placeholder="Meet at north parking, 2 boards in car"
        />
      </label>
      <div className="row-2">
        <label>
          Invite users (@username, comma separated)
          <input
            value={inviteUsersRaw}
            onChange={(event) => setInviteUsersRaw(event.target.value)}
            placeholder="@kostia, @maria"
          />
        </label>
        <label>
          Invite by Telegram (@handle, comma separated)
          <input
            value={inviteTelegramsRaw}
            onChange={(event) => setInviteTelegramsRaw(event.target.value)}
            placeholder="@friend1, @friend2"
          />
        </label>
      </div>
      <div className="friend-picker">
        <p className="tiny">Invite from your friends</p>
        {loadingFriends ? <p className="tiny">Loading friends...</p> : null}
        <div className="chip-row">
          {friends.length === 0 && !loadingFriends ? (
            <p className="tiny">No friends yet. Join or create groups first.</p>
          ) : null}
          {friends.map((friend) => (
            <button
              key={friend.id}
              type="button"
              className={selectedFriendUsernames.includes(friend.username) ? "active-chip" : "ghost"}
              onClick={() => toggleFriend(friend.username)}
            >
              @{friend.username}
            </button>
          ))}
        </div>
      </div>
      <div className="invite-preview">
        <p className="tiny">Invite preview</p>
        {previewUsers.length === 0 && previewTelegrams.length === 0 ? (
          <p className="tiny">No invite recipients selected yet.</p>
        ) : (
          <div className="chip-row">
            {previewUsers.map((user) => (
              <span key={user} className="preview-chip">
                {user}
              </span>
            ))}
            {previewTelegrams.map((tg) => (
              <span key={tg} className="preview-chip">
                tg:{tg}
              </span>
            ))}
          </div>
        )}
      </div>
      <button disabled={disabled || !isSubmitValid} type="submit">
        {disabled ? "Saving..." : "Add to calendar"}
      </button>
    </form>
  );
}
