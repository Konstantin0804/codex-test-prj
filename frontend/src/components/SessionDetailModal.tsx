import { useEffect, useMemo, useState } from "react";
import { api } from "../shared/api";
import { SURF_SPOTS } from "../shared/surfSpots";

interface SessionDetail {
  id: number;
  group_id: number;
  spot_name: string;
  session_date: string;
  meeting_time: string | null;
  level: "beginner" | "intermediate" | "advanced" | "mixed";
  forecast_note: string;
  logistics_note: string;
  created_by_username: string;
  current_user_role: "admin" | "member";
  can_manage: boolean;
  my_rsvp: "going" | "maybe" | "not_going" | null;
  is_completed: boolean;
  average_rating: number | null;
  rating_count: number;
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

interface SessionReport {
  id: number;
  username: string;
  wave_score: number;
  crowd_score: number;
  wind_score: number;
  note: string;
}

interface SessionFeedback {
  id: number;
  username: string;
  stars: number | null;
  comment: string;
}

interface SessionComment {
  id: number;
  username: string;
  body: string;
  created_at: string;
}

interface Props {
  sessionId: number;
  currentUsername: string;
  onClose: () => void;
  onChanged: () => Promise<void>;
}

export function SessionDetailModal({ sessionId, currentUsername, onClose, onChanged }: Props) {
  const [detail, setDetail] = useState<SessionDetail | null>(null);
  const [reports, setReports] = useState<SessionReport[]>([]);
  const [feedback, setFeedback] = useState<SessionFeedback[]>([]);
  const [comments, setComments] = useState<SessionComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editSpot, setEditSpot] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editTime, setEditTime] = useState("");
  const [editLevel, setEditLevel] = useState<"beginner" | "intermediate" | "advanced" | "mixed">("mixed");
  const [editForecast, setEditForecast] = useState("");
  const [editLogistics, setEditLogistics] = useState("");

  const [inviteUsername, setInviteUsername] = useState("");
  const [inviteTelegram, setInviteTelegram] = useState("");
  const [commentBody, setCommentBody] = useState("");
  const [reportForm, setReportForm] = useState({ wave_score: 7, crowd_score: 7, wind_score: 7, note: "" });
  const [feedbackForm, setFeedbackForm] = useState<{ stars: number | null; comment: string }>({
    stars: null,
    comment: ""
  });

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [detailRes, reportsRes, feedbackRes, commentsRes] = await Promise.all([
        api.get<SessionDetail>(`/surf/sessions/${sessionId}/detail`),
        api.get<SessionReport[]>(`/surf/sessions/${sessionId}/reports`),
        api.get<SessionFeedback[]>(`/surf/sessions/${sessionId}/feedback`),
        api.get<SessionComment[]>(`/surf/sessions/${sessionId}/comments`)
      ]);
      const payload = detailRes.data;
      setDetail(payload);
      setReports(reportsRes.data);
      setFeedback(feedbackRes.data);
      setComments(commentsRes.data);
      setEditSpot(payload.spot_name);
      setEditDate(payload.session_date);
      setEditTime(payload.meeting_time ?? "");
      setEditLevel(payload.level);
      setEditForecast(payload.forecast_note);
      setEditLogistics(payload.logistics_note);
      const mine = feedbackRes.data.find((item) => item.username === currentUsername);
      setFeedbackForm({ stars: mine?.stars ?? null, comment: mine?.comment ?? "" });
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Failed to load session");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [sessionId]);

  const canManage = Boolean(detail?.can_manage);

  const deleteSession = async () => {
    if (!detail || !canManage) return;
    if (!window.confirm("Delete this session permanently?")) return;
    setBusy(true);
    try {
      await api.delete(`/surf/sessions/${sessionId}`);
      await onChanged();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Failed to delete session");
    } finally {
      setBusy(false);
    }
  };

  const saveSession = async () => {
    if (!detail || !canManage) return;
    setBusy(true);
    try {
      await api.patch(`/surf/sessions/${sessionId}`, {
        spot_name: editSpot,
        session_date: editDate,
        meeting_time: editTime || null,
        level: editLevel,
        forecast_note: editForecast,
        logistics_note: editLogistics
      });
      await onChanged();
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Failed to update session");
    } finally {
      setBusy(false);
    }
  };

  const setRsvp = async (status: "going" | "maybe" | "not_going") => {
    setBusy(true);
    try {
      await api.patch(`/surf/sessions/${sessionId}/rsvp`, { status, transport_note: "" });
      await onChanged();
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Failed to set RSVP");
    } finally {
      setBusy(false);
    }
  };

  const sendInvite = async () => {
    if (!canManage) return;
    setBusy(true);
    try {
      await api.post(`/surf/sessions/${sessionId}/invite`, {
        username: inviteUsername.trim() || undefined,
        telegram_username: inviteTelegram.trim() || undefined
      });
      setInviteUsername("");
      setInviteTelegram("");
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Failed to send invite");
    } finally {
      setBusy(false);
    }
  };

  const addReport = async () => {
    setBusy(true);
    try {
      await api.post(`/surf/sessions/${sessionId}/reports`, reportForm);
      setReportForm({ wave_score: 7, crowd_score: 7, wind_score: 7, note: "" });
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Failed to save report");
    } finally {
      setBusy(false);
    }
  };

  const saveFeedback = async () => {
    setBusy(true);
    try {
      await api.post(`/surf/sessions/${sessionId}/feedback`, feedbackForm);
      await onChanged();
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Failed to save feedback");
    } finally {
      setBusy(false);
    }
  };

  const uploadPhoto = async (file: File) => {
    setBusy(true);
    try {
      const form = new FormData();
      form.append("photo", file);
      await api.post(`/surf/sessions/${sessionId}/photos`, form);
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Failed to upload photo");
    } finally {
      setBusy(false);
    }
  };

  const postComment = async () => {
    const body = commentBody.trim();
    if (!body) return;
    setBusy(true);
    try {
      await api.post(`/surf/sessions/${sessionId}/comments`, { body });
      setCommentBody("");
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Failed to post comment");
    } finally {
      setBusy(false);
    }
  };

  const favoriteSpots = useMemo(() => SURF_SPOTS.map((item) => item.name), []);

  return (
    <div className="modal-backdrop">
      <div className="modal-wrap">
        <section className="card profile-panel">
          <div className="profile-head">
            <h2>Session</h2>
            <button className="ghost" type="button" onClick={onClose}>
              Close
            </button>
          </div>
          {error ? <p className="error">{error}</p> : null}
          {loading || !detail ? <p className="tiny">Loading...</p> : null}
          {detail ? (
            <div className="profile-form">
              <div className="row-3">
                <label>
                  Spot
                  <select value={editSpot} disabled={!canManage} onChange={(e) => setEditSpot(e.target.value)}>
                    {favoriteSpots.map((spot) => (
                      <option key={spot} value={spot}>
                        {spot}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Date
                  <input type="date" value={editDate} disabled={!canManage} onChange={(e) => setEditDate(e.target.value)} />
                </label>
                <label>
                  Meet Time
                  <input type="time" value={editTime} disabled={!canManage} onChange={(e) => setEditTime(e.target.value)} />
                </label>
              </div>
              <label>
                Forecast note
                <textarea value={editForecast} disabled={!canManage} onChange={(e) => setEditForecast(e.target.value)} />
              </label>
              <label>
                Logistics
                <textarea value={editLogistics} disabled={!canManage} onChange={(e) => setEditLogistics(e.target.value)} />
              </label>
              {canManage ? (
                <div className="chip-row">
                  <button type="button" onClick={saveSession} disabled={busy}>
                    Save session
                  </button>
                  <button type="button" className="ghost danger-btn" onClick={deleteSession} disabled={busy}>
                    Delete session
                  </button>
                </div>
              ) : null}

              {!detail.is_completed ? (
                <div className="chip-row">
                  <button type="button" className={detail.my_rsvp === "going" ? "active-chip" : "ghost"} onClick={() => setRsvp("going")} disabled={busy}>Going</button>
                  <button type="button" className={detail.my_rsvp === "maybe" ? "active-chip" : "ghost"} onClick={() => setRsvp("maybe")} disabled={busy}>Maybe</button>
                  <button type="button" className={detail.my_rsvp === "not_going" ? "active-chip" : "ghost"} onClick={() => setRsvp("not_going")} disabled={busy}>Not Going</button>
                </div>
              ) : null}

              {canManage ? (
                <div className="row-2">
                  <label>
                    Invite username
                    <input value={inviteUsername} onChange={(e) => setInviteUsername(e.target.value)} placeholder="@friend" />
                  </label>
                  <label>
                    Invite Telegram
                    <input value={inviteTelegram} onChange={(e) => setInviteTelegram(e.target.value)} placeholder="@telegram" />
                  </label>
                  <button type="button" onClick={sendInvite} disabled={busy || (!inviteUsername.trim() && !inviteTelegram.trim())}>
                    Send invite
                  </button>
                </div>
              ) : null}

              <div className="report-area">
                <h4>Reports</h4>
                <div className="row-3">
                  <label>Wave<input type="number" min={1} max={10} value={reportForm.wave_score} onChange={(e) => setReportForm((p) => ({ ...p, wave_score: Number(e.target.value) }))} /></label>
                  <label>Crowd<input type="number" min={1} max={10} value={reportForm.crowd_score} onChange={(e) => setReportForm((p) => ({ ...p, crowd_score: Number(e.target.value) }))} /></label>
                  <label>Wind<input type="number" min={1} max={10} value={reportForm.wind_score} onChange={(e) => setReportForm((p) => ({ ...p, wind_score: Number(e.target.value) }))} /></label>
                </div>
                <label>Note<input value={reportForm.note} onChange={(e) => setReportForm((p) => ({ ...p, note: e.target.value }))} /></label>
                <button type="button" onClick={addReport} disabled={busy}>Save report</button>
                <div className="report-list">
                  {reports.map((row) => (
                    <div key={row.id} className="report-item">
                      <p><strong>@{row.username}</strong> · w{row.wave_score} c{row.crowd_score} ws{row.wind_score}</p>
                      <p className="tiny">{row.note}</p>
                    </div>
                  ))}
                </div>
              </div>

              {detail.is_completed ? (
                <div className="report-area">
                  <h4>Feedback</h4>
                  <div className="rating-stars">
                    {[1, 2, 3, 4, 5].map((value) => (
                      <button key={value} type="button" className={`star-btn ${(feedbackForm.stars ?? 0) >= value ? "active" : ""}`} onClick={() => setFeedbackForm((p) => ({ ...p, stars: value }))}>★</button>
                    ))}
                    <button type="button" className="ghost star-clear" onClick={() => setFeedbackForm((p) => ({ ...p, stars: null }))}>Clear</button>
                  </div>
                  <label>Comment<input value={feedbackForm.comment} onChange={(e) => setFeedbackForm((p) => ({ ...p, comment: e.target.value }))} /></label>
                  <button type="button" onClick={saveFeedback} disabled={busy}>Save feedback</button>
                  <div className="report-list">
                    {feedback.map((row) => (
                      <div key={row.id} className="report-item">
                        <p><strong>@{row.username}</strong>{row.stars !== null ? ` · ${row.stars}⭐` : ""}</p>
                        <p className="tiny">{row.comment}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="photo-area">
                <h4>Photos</h4>
                <div className="photo-upload-actions">
                  <label className="avatar-upload-btn" htmlFor={`modal-session-photo-${sessionId}`}>
                    {busy ? "Uploading..." : "Upload session photo"}
                  </label>
                  <input
                    id={`modal-session-photo-${sessionId}`}
                    className="avatar-upload-input"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                    disabled={busy}
                    onChange={async (event) => {
                      const file = event.target.files?.[0];
                      if (!file) return;
                      await uploadPhoto(file);
                      event.currentTarget.value = "";
                    }}
                  />
                </div>
                <div className="photo-deck">
                  {detail.photos.map((photo, index) => (
                    <a key={photo.id} href={photo.public_url} target="_blank" rel="noreferrer" className="photo-deck-card" style={{ zIndex: detail.photos.length - index }}>
                      <img src={photo.public_url} alt={`Photo by @${photo.uploaded_by_username}`} />
                    </a>
                  ))}
                </div>
              </div>

              <div className="report-area">
                <h4>Comments</h4>
                <label>
                  Message
                  <input value={commentBody} onChange={(e) => setCommentBody(e.target.value)} placeholder="Write comment" />
                </label>
                <button type="button" onClick={postComment} disabled={busy || !commentBody.trim()}>
                  Post comment
                </button>
                <div className="report-list">
                  {comments.map((item) => (
                    <div key={item.id} className="report-item">
                      <p><strong>@{item.username}</strong></p>
                      <p className="tiny">{item.body}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
