import { FormEvent, useEffect, useMemo, useState } from "react";
import type { FriendSummary, SessionLevel } from "../features/surf/types";
import { SurfSpotsMap } from "./SurfSpotsMap";
import { SURF_SPOTS, findSurfSpotByName } from "../shared/surfSpots";
import { api } from "../shared/api";

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

interface SpotForecast {
  provider: string;
  spot_name: string;
  session_date: string;
  target_time: string;
  wave_height_m: number | null;
  wave_direction_deg: number | null;
  wave_direction_cardinal: string;
  wave_period_s: number | null;
  wind_speed_kmh: number | null;
  wind_direction_deg: number | null;
  wind_direction_cardinal: string;
  water_temperature_c: number | null;
  sea_level_m: number | null;
  tide_level: string;
  tide_trend: string;
  summary: string;
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
  const [forecast, setForecast] = useState<SpotForecast | null>(null);
  const [forecastLoading, setForecastLoading] = useState(false);
  const [forecastError, setForecastError] = useState<string | null>(null);

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
  const selectedSpot = findSurfSpotByName(spotName);
  const isSpotValid = Boolean(selectedSpot);
  const isDateValid = Boolean(sessionDate);
  const isTimeValid = Boolean(meetingTime);
  const isSubmitValid = isSpotValid && isDateValid && isTimeValid;
  const spotSuggestions = useMemo(() => {
    const query = spotName.trim().toLowerCase();
    return SURF_SPOTS.filter((spot) => {
      if (!query) {
        return true;
      }
      return (
        spot.name.toLowerCase().includes(query) || spot.region.toLowerCase().includes(query)
      );
    });
  }, [spotName]);

  useEffect(() => {
    if (!selectedSpot || !sessionDate) {
      setForecast(null);
      setForecastError(null);
      return;
    }
    let cancelled = false;
    const load = async () => {
      setForecastLoading(true);
      setForecastError(null);
      try {
        const response = await api.get<SpotForecast>("/surf/forecast/open-meteo", {
          params: {
            spot_name: selectedSpot.name,
            session_date: sessionDate,
            meeting_time: meetingTime || undefined,
          },
        });
        if (!cancelled) {
          setForecast(response.data);
        }
      } catch (err: any) {
        if (!cancelled) {
          setForecast(null);
          setForecastError(err?.response?.data?.detail ?? "Failed to load forecast");
        }
      } finally {
        if (!cancelled) {
          setForecastLoading(false);
        }
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [selectedSpot?.name, sessionDate, meetingTime]);

  const applyForecastToNote = () => {
    if (!forecast?.summary) {
      return;
    }
    setForecastNote(forecast.summary);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedSpot) {
      return;
    }
    await onSubmit({
      spot_name: selectedSpot!.name,
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
      <div className="session-spot-layout">
        <div className="session-spot-picker">
          <label>
            Spot *
            <input
              value={spotName}
              onChange={(event) => setSpotName(event.target.value)}
              placeholder="Start typing to search spots..."
            />
          </label>
          {selectedSpot ? (
            <p className="tiny">
              <em>{selectedSpot.region}</em>
            </p>
          ) : null}
          <div className="spot-suggest">
            {spotSuggestions.map((spot) => (
              <button
                key={spot.name}
                type="button"
                className={`spot-option ${spot.name === selectedSpot?.name ? "active" : ""}`}
                onClick={() => setSpotName(spot.name)}
              >
                <span>{spot.name}</span>
                <span className="spot-option-meta">
                  <em>{spot.region}</em>
                </span>
              </button>
            ))}
          </div>
        </div>
        <SurfSpotsMap selectedSpotName={selectedSpot?.name ?? null} onSelectSpot={(name) => setSpotName(name)} />
      </div>
      {spotName.trim().length > 0 && !isSpotValid ? (
        <p className="tiny error-text">Select a spot from the list.</p>
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
      <div className="forecast-card">
        <div className="forecast-head">
          <p className="tiny"><strong>Open-Meteo Marine forecast</strong></p>
          <button type="button" className="ghost" disabled={!forecast} onClick={applyForecastToNote}>
            Use in note
          </button>
        </div>
        {forecastLoading ? <p className="tiny">Loading forecast...</p> : null}
        {forecastError ? <p className="tiny error-text">{forecastError}</p> : null}
        {forecast ? (
          <div className="forecast-grid">
            <p className="tiny">Wave: {forecast.wave_height_m !== null ? `${forecast.wave_height_m.toFixed(1)} m` : "n/a"}</p>
            <p className="tiny">Wind: {forecast.wind_speed_kmh !== null ? `${Math.round(forecast.wind_speed_kmh)} km/h ${forecast.wind_direction_cardinal}` : "n/a"}</p>
            <p className="tiny">Water: {forecast.water_temperature_c !== null ? `${forecast.water_temperature_c.toFixed(1)}°C` : "n/a"}</p>
            <p className="tiny">Tide: {forecast.tide_level} ({forecast.tide_trend})</p>
          </div>
        ) : null}
      </div>
      <label>
        Forecast Note
        <span className="tiny">
          Recommended: check{" "}
          <a href="https://www.surfline.com/" target="_blank" rel="noreferrer">
            Surfline
          </a>{" "}
          and{" "}
          <a href="https://www.windy.com/" target="_blank" rel="noreferrer">
            Windy
          </a>
          .
        </span>
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
