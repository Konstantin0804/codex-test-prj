import { useEffect, useState } from "react";
import { api } from "../shared/api";

interface SessionDetail {
  id: number;
  group_id: number;
  spot_name: string;
  session_date: string;
  meeting_time: string | null;
  level: string;
  forecast_note: string;
  logistics_note: string;
  created_at: string;
  created_by_username: string;
  is_completed: boolean;
  completed_at: string | null;
  average_rating: number | null;
  rating_count: number;
  forecast_snapshot: {
    provider: string | null;
    target_time: string | null;
    wave_height_m: number | null;
    wind_speed_kmh: number | null;
    wind_direction_cardinal: string | null;
    water_temperature_c: number | null;
    tide_level: string | null;
    tide_trend: string | null;
    summary: string | null;
  } | null;
  participants: string[];
  invites: {
    id: number;
    invited_username: string | null;
    invited_telegram_username: string | null;
    status: string;
    invited_by_username: string;
    accepted_at: string | null;
  }[];
  photos: {
    id: number;
    public_url: string;
    uploaded_by_username: string;
  }[];
}

interface Props {
  sessionId: number;
  onClose: () => void;
}

export function SessionDetailModal({ sessionId, onClose }: Props) {
  const [detail, setDetail] = useState<SessionDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    try {
      const response = await api.get<SessionDetail>(`/surf/sessions/${sessionId}/detail`);
      setDetail(response.data);
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Failed to load session details");
    }
  };

  useEffect(() => {
    void load();
  }, [sessionId]);

  const uploadPhoto = async (file: File) => {
    if (!file) {
      return;
    }
    setUploading(true);
    try {
      const form = new FormData();
      form.append("photo", file);
      await api.post(`/surf/sessions/${sessionId}/photos`, form);
      await load();
    } finally {
      setUploading(false);
    }
  };

  const windArrow = (cardinal: string | null) => {
    switch ((cardinal ?? "").toUpperCase()) {
      case "N":
        return "↓";
      case "NE":
        return "↙";
      case "E":
        return "←";
      case "SE":
        return "↖";
      case "S":
        return "↑";
      case "SW":
        return "↗";
      case "W":
        return "→";
      case "NW":
        return "↘";
      default:
        return "•";
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-wrap">
        <section className="card profile-panel">
          <div className="profile-head">
            <h2>Session Details</h2>
            <button className="ghost" type="button" onClick={onClose}>
              X
            </button>
          </div>
          {error ? <p className="error">{error}</p> : null}
          {!detail ? <p className="tiny">Loading...</p> : null}
          {detail ? (
            <div className="profile-readonly">
              <p>
                <strong>{detail.session_date} · {detail.spot_name}</strong>
              </p>
              <p className="tiny">
                {detail.meeting_time ?? "No meet time"} · level {detail.level} · owner @{detail.created_by_username}
              </p>
              <p className="tiny">
                {detail.is_completed
                  ? `Completed${detail.average_rating !== null ? ` · ${detail.average_rating.toFixed(1)}⭐ (${detail.rating_count})` : ""}`
                  : "Not completed"}
              </p>
              {detail.forecast_snapshot ? (
                <>
                  <div className="forecast-inline">
                    <span className="forecast-pill">🌊 {detail.forecast_snapshot.wave_height_m !== null ? `${detail.forecast_snapshot.wave_height_m.toFixed(1)} m` : "n/a"}</span>
                    <span className="forecast-pill">
                      💨
                      {detail.forecast_snapshot.wind_speed_kmh !== null
                        ? ` ${Math.round(detail.forecast_snapshot.wind_speed_kmh)} km/h ${windArrow(detail.forecast_snapshot.wind_direction_cardinal)} ${detail.forecast_snapshot.wind_direction_cardinal ?? "N/A"}`
                        : " n/a"}
                    </span>
                    <span className="forecast-pill">🌡️ {detail.forecast_snapshot.water_temperature_c !== null ? `${detail.forecast_snapshot.water_temperature_c.toFixed(1)}°C` : "n/a"}</span>
                    <span className="forecast-pill">🌊⬍ {detail.forecast_snapshot.tide_level ?? "n/a"} ({detail.forecast_snapshot.tide_trend ?? "n/a"})</span>
                  </div>
                  <p className="tiny">{detail.forecast_snapshot.summary ?? "Forecast snapshot saved"}</p>
                </>
              ) : null}
              <p className="tiny">{detail.forecast_note || "No forecast note"}</p>
              <p className="tiny">{detail.logistics_note || "No logistics note"}</p>

              <p className="tiny">Participants: {detail.participants.map((u) => `@${u}`).join(", ") || "-"}</p>

              <h4>Invites</h4>
              <div className="report-list">
                {detail.invites.map((invite) => (
                  <div key={invite.id} className="report-item">
                    <p>
                      <strong>
                        {invite.invited_username
                          ? `@${invite.invited_username}`
                          : invite.invited_telegram_username
                            ? `@${invite.invited_telegram_username}`
                            : "Unknown"}
                      </strong>
                      {" · "}
                      {invite.status}
                    </p>
                  </div>
                ))}
                {detail.invites.length === 0 ? <p className="tiny">No invites yet.</p> : null}
              </div>

              <h4>Photos</h4>
              <div className="photo-upload-row">
                <div className="photo-upload-actions">
                  <label className="avatar-upload-btn" htmlFor={`detail-session-photo-${sessionId}`}>
                    {uploading ? "Uploading..." : "Upload session photo"}
                  </label>
                  <input
                    id={`detail-session-photo-${sessionId}`}
                    className="avatar-upload-input"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                    disabled={uploading}
                    onChange={async (event) => {
                      const selected = event.target.files?.[0];
                      if (!selected) {
                        return;
                      }
                      await uploadPhoto(selected);
                      event.currentTarget.value = "";
                    }}
                  />
                  <label className="avatar-upload-btn" htmlFor={`detail-forecast-photo-${sessionId}`}>
                    {uploading ? "Uploading..." : "Upload forecast screenshot"}
                  </label>
                  <input
                    id={`detail-forecast-photo-${sessionId}`}
                    className="avatar-upload-input"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                    disabled={uploading}
                    onChange={async (event) => {
                      const selected = event.target.files?.[0];
                      if (!selected) {
                        return;
                      }
                      await uploadPhoto(selected);
                      event.currentTarget.value = "";
                    }}
                  />
                </div>
              </div>
              <div className="photo-deck">
                {detail.photos.map((photo, index) => (
                  <a
                    key={photo.id}
                    href={photo.public_url}
                    target="_blank"
                    rel="noreferrer"
                    className="photo-deck-card"
                    style={{ zIndex: detail.photos.length - index }}
                    title={`@${photo.uploaded_by_username}`}
                  >
                    <img src={photo.public_url} alt={`Photo by @${photo.uploaded_by_username}`} />
                  </a>
                ))}
                {detail.photos.length === 0 ? <p className="tiny">No photos yet.</p> : null}
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
