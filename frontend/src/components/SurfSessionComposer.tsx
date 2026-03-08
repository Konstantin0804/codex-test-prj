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

interface ProfileSummary {
  favorite_spots: string[];
}

function windArrow(cardinal: string): string {
  const key = (cardinal || "").toUpperCase();
  if (key === "N") return "⬆️";
  if (key === "NE") return "↗️";
  if (key === "E") return "➡️";
  if (key === "SE") return "↘️";
  if (key === "S") return "⬇️";
  if (key === "SW") return "↙️";
  if (key === "W") return "⬅️";
  if (key === "NW") return "↖️";
  return "•";
}

const FORECAST_SNAPSHOT_PREFIX = "surf_forecast_snapshot_v1:";
const FORECAST_CACHE_TTL_MS = 20 * 60 * 1000;

function defaultMeetingTimePlusHour(): string {
  const value = new Date();
  const roundedMinutes = value.getMinutes() < 30 ? 0 : 30;
  value.setMinutes(roundedMinutes, 0, 0);
  value.setHours(value.getHours() + 1);
  const hours = String(value.getHours()).padStart(2, "0");
  const minutes = String(value.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function forecastKey(spotName: string, sessionDate: string, meetingTime: string): string {
  return `${FORECAST_SNAPSHOT_PREFIX}${spotName}|${sessionDate}|${meetingTime || "06:30"}`;
}

function readForecastSnapshot(key: string): SpotForecast | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as { fetched_at: number; payload: SpotForecast };
    if (!parsed?.payload || typeof parsed?.fetched_at !== "number") {
      return null;
    }
    if (Date.now() - parsed.fetched_at > FORECAST_CACHE_TTL_MS) {
      return null;
    }
    return parsed.payload;
  } catch {
    return null;
  }
}

function writeForecastSnapshot(key: string, payload: SpotForecast): void {
  try {
    window.localStorage.setItem(
      key,
      JSON.stringify({
        fetched_at: Date.now(),
        payload,
      })
    );
  } catch {
    // ignore storage quota or blocked storage
  }
}

export function SurfSessionComposer({ disabled, friends, loadingFriends, onSubmit }: Props) {
  const [spotName, setSpotName] = useState("");
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().slice(0, 10));
  const [meetingTime, setMeetingTime] = useState(() => defaultMeetingTimePlusHour());
  const [level, setLevel] = useState<SessionLevel>("mixed");
  const [forecastNote, setForecastNote] = useState("");
  const [logisticsNote, setLogisticsNote] = useState("");
  const [selectedFriendUsernames, setSelectedFriendUsernames] = useState<string[]>([]);
  const [inviteUsersRaw, setInviteUsersRaw] = useState("");
  const [inviteTelegramsRaw, setInviteTelegramsRaw] = useState("");
  const [forecast, setForecast] = useState<SpotForecast | null>(null);
  const [forecastLoading, setForecastLoading] = useState(false);
  const [forecastError, setForecastError] = useState<string | null>(null);
  const [favoriteSpots, setFavoriteSpots] = useState<string[]>([]);

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
  const favoriteSpotsSet = useMemo(() => new Set(favoriteSpots), [favoriteSpots]);
  const isSpotValid = Boolean(selectedSpot);
  const isDateValid = Boolean(sessionDate);
  const isTimeValid = Boolean(meetingTime);
  const isSubmitValid = isSpotValid && isDateValid && isTimeValid;
  const spotSuggestions = useMemo(() => {
    const query = spotName.trim().toLowerCase();
    const filtered = SURF_SPOTS.filter((spot) => {
      if (!query) {
        return true;
      }
      return (
        spot.name.toLowerCase().includes(query) || spot.region.toLowerCase().includes(query)
      );
    });
    return filtered.sort((a, b) => {
      const aFav = favoriteSpotsSet.has(a.name) ? 1 : 0;
      const bFav = favoriteSpotsSet.has(b.name) ? 1 : 0;
      if (aFav !== bFav) {
        return bFav - aFav;
      }
      return 0;
    });
  }, [spotName, favoriteSpotsSet]);

  useEffect(() => {
    let cancelled = false;
    const loadFavoriteSpots = async () => {
      try {
        const response = await api.get<ProfileSummary>("/auth/profile");
        if (!cancelled) {
          setFavoriteSpots(response.data.favorite_spots ?? []);
        }
      } catch {
        if (!cancelled) {
          setFavoriteSpots([]);
        }
      }
    };
    void loadFavoriteSpots();
    return () => {
      cancelled = true;
    };
  }, []);

  const targetDateTime = useMemo(() => {
    if (!sessionDate) {
      return null;
    }
    const timeValue = meetingTime || "06:30";
    const candidate = new Date(`${sessionDate}T${timeValue}:00`);
    if (Number.isNaN(candidate.getTime())) {
      return null;
    }
    return candidate;
  }, [sessionDate, meetingTime]);

  const isPastTarget = useMemo(() => {
    if (!targetDateTime) {
      return false;
    }
    return targetDateTime.getTime() <= Date.now();
  }, [targetDateTime]);

  useEffect(() => {
    if (!selectedSpot || !sessionDate) {
      setForecast(null);
      setForecastError(null);
      return;
    }
    const key = forecastKey(selectedSpot.name, sessionDate, meetingTime);
    const cached = readForecastSnapshot(key);
    if (cached) {
      setForecast(cached);
      setForecastError(null);
      if (isPastTarget) {
        setForecastLoading(false);
        return;
      }
    } else if (isPastTarget) {
      setForecast(null);
      setForecastError(null);
      setForecastLoading(false);
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
          writeForecastSnapshot(key, response.data);
        }
      } catch (err: any) {
        if (!cancelled) {
          if (!cached) {
            setForecast(null);
            setForecastError(err?.response?.data?.detail ?? "Failed to load forecast");
          }
        }
      } finally {
        if (!cancelled) {
          setForecastLoading(false);
        }
      }
    };
    const timer = window.setTimeout(() => {
      void load();
    }, 420);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [selectedSpot?.name, sessionDate, meetingTime, isPastTarget]);

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
            <div className="spot-picker-card">
              <div className="spot-input-wrap">
                <input
                  value={spotName}
                  onChange={(event) => setSpotName(event.target.value)}
                  placeholder="Start typing to search spots..."
                />
                {selectedSpot ? <span className="spot-check" aria-label="Spot selected">✓</span> : null}
              </div>
              <div className="spot-suggest">
                {spotSuggestions.map((spot) => (
                  <button
                    key={spot.name}
                    type="button"
                    className={`spot-option ${spot.name === selectedSpot?.name ? "active" : ""}`}
                    onClick={() => setSpotName(spot.name)}
                  >
                    <span>
                      {spot.name}
                      {favoriteSpotsSet.has(spot.name) ? " ♡" : ""}
                    </span>
                    <span className="spot-option-meta">
                      <em>{spot.region}</em>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </label>
          {selectedSpot ? (
            <p className="tiny">
              <em>{selectedSpot.region}</em>
            </p>
          ) : null}
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
      <div className="forecast-row">
        <div className="forecast-card">
          <div className="forecast-head">
            <p className="tiny"><strong>Open-Meteo Marine</strong></p>
            <button type="button" className="ghost forecast-note-btn" disabled={!forecast} onClick={applyForecastToNote}>
              To note
            </button>
          </div>
          {forecastLoading ? <p className="tiny">Loading forecast...</p> : null}
          {forecastError ? <p className="tiny error-text">{forecastError}</p> : null}
          {forecast ? (
            <div className="forecast-inline">
              <span className="forecast-pill">🌊 {forecast.wave_height_m !== null ? `${forecast.wave_height_m.toFixed(1)} m` : "n/a"}</span>
              <span className="forecast-pill">
                💨{" "}
                {forecast.wind_speed_kmh !== null
                  ? `${Math.round(forecast.wind_speed_kmh)} km/h ${windArrow(forecast.wind_direction_cardinal)} ${forecast.wind_direction_cardinal}`
                  : "n/a"}
              </span>
              <span className="forecast-pill">🌡️ {forecast.water_temperature_c !== null ? `${forecast.water_temperature_c.toFixed(1)}°C` : "n/a"}</span>
              <span className="forecast-pill">🌊⬍ {forecast.tide_level} ({forecast.tide_trend})</span>
            </div>
          ) : null}
          {!forecastLoading && !forecastError && !forecast ? (
            <p className="tiny">
              {!selectedSpot
                ? "Select a spot to load forecast."
                : isPastTarget
                  ? "Historical mode: forecast updates are frozen for past time."
                  : "Pick date/time to load forecast."}
            </p>
          ) : null}
          {forecast && isPastTarget ? (
            <p className="tiny">Historical snapshot mode: no auto-refresh for past sessions.</p>
          ) : null}
        </div>
        <label className="forecast-note-card">
          <span className="forecast-note-head">
            <span>Forecast Note</span>
            <span className="tiny forecast-note-rec">
              Recommended: check also{" "}
              <a href="https://www.surfline.com/" target="_blank" rel="noreferrer">
                Surfline
              </a>{" "}
              and{" "}
              <a href="https://www.windy.com/" target="_blank" rel="noreferrer">
                Windy
              </a>
              .
            </span>
          </span>
          <textarea
            value={forecastNote}
            onChange={(event) => setForecastNote(event.target.value)}
            placeholder="2-3ft, offshore till 9am"
          />
        </label>
      </div>
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
