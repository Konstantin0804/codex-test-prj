import { FormEvent, useEffect, useMemo, useState } from "react";
import type { SessionFeedback, SessionPhoto, SessionReport, SurfSession } from "../features/surf/types";

interface Props {
  currentUsername: string;
  sessions: SurfSession[];
  loading: boolean;
  rsvpLoadingIds: number[];
  reportLoadingIds: number[];
  feedbackLoadingIds: number[];
  feedbackSavingIds: number[];
  completingSessionIds: number[];
  reportsBySession: Record<number, SessionReport[]>;
  feedbackBySession: Record<number, SessionFeedback[]>;
  photosBySession: Record<number, SessionPhoto[]>;
  sendingInvite: boolean;
  photoLoadingIds: number[];
  photoUploadingIds: number[];
  onSendInvite: (sessionId: number, username?: string, telegramUsername?: string) => Promise<void>;
  onRsvp: (sessionId: number, status: "going" | "maybe" | "not_going") => Promise<void>;
  onCompleteSession: (sessionId: number) => Promise<void>;
  onCreateReport: (
    sessionId: number,
    payload: { wave_score: number; crowd_score: number; wind_score: number; note: string }
  ) => Promise<void>;
  onLoadReports: (sessionId: number) => Promise<void>;
  onLoadFeedback: (sessionId: number) => Promise<void>;
  onSubmitFeedback: (sessionId: number, stars: number | null, comment: string) => Promise<void>;
  onLoadPhotos: (sessionId: number) => Promise<void>;
  onUploadPhoto: (sessionId: number, file: File) => Promise<void>;
}

export function SurfCalendar({
  currentUsername,
  sessions,
  loading,
  rsvpLoadingIds,
  reportLoadingIds,
  feedbackLoadingIds,
  feedbackSavingIds,
  completingSessionIds,
  reportsBySession,
  feedbackBySession,
  photosBySession,
  sendingInvite,
  photoLoadingIds,
  photoUploadingIds,
  onSendInvite,
  onRsvp,
  onCompleteSession,
  onCreateReport,
  onLoadReports,
  onLoadFeedback,
  onSubmitFeedback,
  onLoadPhotos,
  onUploadPhoto
}: Props) {
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

  const [openReportFor, setOpenReportFor] = useState<number | null>(null);
  const [openFeedbackFor, setOpenFeedbackFor] = useState<number | null>(null);
  const [openPhotosFor, setOpenPhotosFor] = useState<number | null>(null);
  const [formState, setFormState] = useState({ wave_score: 7, crowd_score: 6, wind_score: 7, note: "" });
  const [feedbackForm, setFeedbackForm] = useState<{ stars: number | null; comment: string }>({
    stars: null,
    comment: ""
  });
  const [feedbackEditedFor, setFeedbackEditedFor] = useState<number | null>(null);
  const [inviteUsername, setInviteUsername] = useState("");
  const [inviteTelegram, setInviteTelegram] = useState("");

  useEffect(() => {
    if (openFeedbackFor === null || feedbackEditedFor === openFeedbackFor) {
      return;
    }
    const mine = (feedbackBySession[openFeedbackFor] ?? []).find(
      (item) => item.username === currentUsername
    );
    setFeedbackForm({
      stars: mine?.stars ?? null,
      comment: mine?.comment ?? ""
    });
  }, [openFeedbackFor, feedbackBySession, currentUsername, feedbackEditedFor]);

  const groupByDate = (items: SurfSession[]) => {
    const map: Record<string, SurfSession[]> = {};
    for (const session of items) {
      map[session.session_date] = map[session.session_date] ?? [];
      map[session.session_date].push(session);
    }
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  };

  const completedGroups = useMemo(() => {
    const completed = sessions.filter((session) => session.is_completed);
    return groupByDate(completed).reverse();
  }, [sessions]);

  const plannedGroups = useMemo(() => {
    const planned = sessions.filter((session) => !session.is_completed);
    return groupByDate(planned);
  }, [sessions]);

  const submitReport = async (event: FormEvent, sessionId: number) => {
    event.preventDefault();
    await onCreateReport(sessionId, formState);
    setFormState({ wave_score: 7, crowd_score: 6, wind_score: 7, note: "" });
  };

  if (loading) {
    return <p className="status">Loading sessions...</p>;
  }

  const renderSessionCard = (session: SurfSession) => (
    <div className="session-card" key={session.id}>
                <div className="session-head">
                  <strong>{session.spot_name}</strong>
                  <span>{session.meeting_time ?? "No meet time"}</span>
                </div>
                <p className="tiny">Level: {session.level}</p>
                <p className="tiny">
                  {session.is_completed
                    ? `Completed${session.average_rating !== null ? ` · Avg ${session.average_rating.toFixed(1)}⭐ (${session.rating_count})` : " · No ratings yet"}`
                    : "Not completed yet"}
                </p>
                {session.forecast_snapshot ? (
                  <div className="forecast-inline">
                    <span className="forecast-pill">🌊 {session.forecast_snapshot.wave_height_m !== null ? `${session.forecast_snapshot.wave_height_m.toFixed(1)} m` : "n/a"}</span>
                    <span className="forecast-pill">
                      💨
                      {session.forecast_snapshot.wind_speed_kmh !== null
                        ? ` ${Math.round(session.forecast_snapshot.wind_speed_kmh)} km/h ${windArrow(session.forecast_snapshot.wind_direction_cardinal)} ${session.forecast_snapshot.wind_direction_cardinal ?? "N/A"}`
                        : " n/a"}
                    </span>
                    <span className="forecast-pill">🌡️ {session.forecast_snapshot.water_temperature_c !== null ? `${session.forecast_snapshot.water_temperature_c.toFixed(1)}°C` : "n/a"}</span>
                    <span className="forecast-pill">🌊⬍ {session.forecast_snapshot.tide_level ?? "n/a"} ({session.forecast_snapshot.tide_trend ?? "n/a"})</span>
                  </div>
                ) : null}
                <p>{session.forecast_note || "Forecast note not added"}</p>
                <p>{session.logistics_note || "Logistics note not added"}</p>
                <div className="chip-row">
                  <button
                    className={session.my_rsvp === "going" ? "active-chip" : "ghost"}
                    disabled={rsvpLoadingIds.includes(session.id)}
                    onClick={() => onRsvp(session.id, "going")}
                  >
                    {rsvpLoadingIds.includes(session.id) ? "Saving..." : "Going"}
                  </button>
                  <button
                    className={session.my_rsvp === "maybe" ? "active-chip" : "ghost"}
                    disabled={rsvpLoadingIds.includes(session.id)}
                    onClick={() => onRsvp(session.id, "maybe")}
                  >
                    Maybe
                  </button>
                  <button
                    className={session.my_rsvp === "not_going" ? "active-chip" : "ghost"}
                    disabled={rsvpLoadingIds.includes(session.id)}
                    onClick={() => onRsvp(session.id, "not_going")}
                  >
                    Not Going
                  </button>
                  <button
                    className="ghost"
                    onClick={async () => {
                      setOpenReportFor(openReportFor === session.id ? null : session.id);
                      await onLoadReports(session.id);
                    }}
                  >
                    Reports
                  </button>
                  <button
                    className="ghost"
                    disabled={!session.can_complete || session.is_completed || completingSessionIds.includes(session.id)}
                    onClick={async () => {
                      const ok = window.confirm("Complete this session?");
                      if (!ok) {
                        return;
                      }
                      await onCompleteSession(session.id);
                    }}
                  >
                    {completingSessionIds.includes(session.id) ? "Completing..." : "Complete"}
                  </button>
                  <button
                    className="ghost"
                    disabled={!session.is_completed}
                    onClick={async () => {
                      const next = openFeedbackFor === session.id ? null : session.id;
                      setOpenFeedbackFor(next);
                      setFeedbackEditedFor(null);
                      if (next === null) {
                        setFeedbackForm({ stars: null, comment: "" });
                        return;
                      }
                      const mine = (feedbackBySession[session.id] ?? []).find(
                        (item) => item.username === currentUsername
                      );
                      setFeedbackForm({
                        stars: mine?.stars ?? null,
                        comment: mine?.comment ?? ""
                      });
                      if (next !== null) {
                        await onLoadFeedback(session.id);
                      }
                    }}
                  >
                    Feedback
                  </button>
                  <button
                    className="ghost"
                    onClick={async () => {
                      setOpenPhotosFor(openPhotosFor === session.id ? null : session.id);
                      await onLoadPhotos(session.id);
                    }}
                  >
                    Photos
                  </button>
                </div>

                {openFeedbackFor === session.id ? (
                  <div className="report-area">
                    <form
                      onSubmit={async (event) => {
                        event.preventDefault();
                        await onSubmitFeedback(session.id, feedbackForm.stars, feedbackForm.comment);
                        setFeedbackEditedFor(null);
                      }}
                      className="report-form"
                    >
                      <div className="feedback-stars-row">
                        <label>
                          Rating
                          <div className="rating-stars" role="radiogroup" aria-label="Session rating">
                            {[1, 2, 3, 4, 5].map((value) => {
                              const active = (feedbackForm.stars ?? 0) >= value;
                              return (
                                <button
                                  key={value}
                                  type="button"
                                  className={`star-btn ${active ? "active" : ""}`}
                                  onClick={() => {
                                    setFeedbackEditedFor(session.id);
                                    setFeedbackForm((prev) => ({
                                      ...prev,
                                      stars: prev.stars === value ? null : value
                                    }));
                                  }}
                                  aria-label={`${value} star${value > 1 ? "s" : ""}`}
                                >
                                  ★
                                </button>
                              );
                            })}
                            <button
                              type="button"
                              className="ghost star-clear"
                              onClick={() => {
                                setFeedbackEditedFor(session.id);
                                setFeedbackForm((prev) => ({ ...prev, stars: null }));
                              }}
                            >
                              Clear
                            </button>
                          </div>
                        </label>
                        <label>
                          Comment
                          <input
                            value={feedbackForm.comment}
                            onChange={(event) =>
                              {
                                setFeedbackEditedFor(session.id);
                                setFeedbackForm((prev) => ({ ...prev, comment: event.target.value }));
                              }
                            }
                            placeholder="Optional note"
                          />
                        </label>
                      </div>
                      <button disabled={feedbackSavingIds.includes(session.id)} type="submit">
                        {feedbackSavingIds.includes(session.id) ? "Saving..." : "Save feedback"}
                      </button>
                    </form>
                    {feedbackLoadingIds.includes(session.id) ? <p className="tiny">Loading feedback...</p> : null}
                    <div className="report-list">
                      {(feedbackBySession[session.id] ?? []).map((item) => (
                        <div key={item.id} className="report-item">
                          <p>
                            <strong>@{item.username}</strong>
                            {item.stars !== null ? ` · ${item.stars}⭐` : ""}
                          </p>
                          {item.comment ? <p className="tiny">{item.comment}</p> : null}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
                <div className="invite-row">
                  <input
                    placeholder="Invite by username"
                    value={inviteUsername}
                    onChange={(event) => setInviteUsername(event.target.value)}
                  />
                  <input
                    placeholder="or @telegram"
                    value={inviteTelegram}
                    onChange={(event) => setInviteTelegram(event.target.value)}
                  />
                  <button
                    className="ghost"
                    disabled={sendingInvite || (!inviteUsername.trim() && !inviteTelegram.trim())}
                    onClick={async () => {
                      await onSendInvite(
                        session.id,
                        inviteUsername.trim() || undefined,
                        inviteTelegram.trim() || undefined
                      );
                      setInviteUsername("");
                      setInviteTelegram("");
                    }}
                  >
                    {sendingInvite ? "Sending..." : "Invite"}
                  </button>
                </div>

                {openReportFor === session.id ? (
                  <div className="report-area">
                    <form onSubmit={(event) => void submitReport(event, session.id)} className="report-form">
                      <div className="row-3">
                        <label>
                          Wave
                          <input
                            type="number"
                            min={1}
                            max={10}
                            value={formState.wave_score}
                            onChange={(event) =>
                              setFormState((prev) => ({ ...prev, wave_score: Number(event.target.value) }))
                            }
                          />
                        </label>
                        <label>
                          Crowd
                          <input
                            type="number"
                            min={1}
                            max={10}
                            value={formState.crowd_score}
                            onChange={(event) =>
                              setFormState((prev) => ({ ...prev, crowd_score: Number(event.target.value) }))
                            }
                          />
                        </label>
                        <label>
                          Wind
                          <input
                            type="number"
                            min={1}
                            max={10}
                            value={formState.wind_score}
                            onChange={(event) =>
                              setFormState((prev) => ({ ...prev, wind_score: Number(event.target.value) }))
                            }
                          />
                        </label>
                      </div>
                      <label>
                        Session note
                        <textarea
                          value={formState.note}
                          onChange={(event) =>
                            setFormState((prev) => ({ ...prev, note: event.target.value }))
                          }
                        />
                      </label>
                      <button disabled={reportLoadingIds.includes(session.id)} type="submit">
                        {reportLoadingIds.includes(session.id) ? "Saving..." : "Save report"}
                      </button>
                    </form>
                    <div className="report-list">
                      {(reportsBySession[session.id] ?? []).map((report) => (
                        <div key={report.id} className="report-item">
                          <p>
                            <strong>@{report.username}</strong> wave {report.wave_score}/10 crowd {report.crowd_score}/10 wind {report.wind_score}/10
                          </p>
                          <p className="tiny">{report.note}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
                {openPhotosFor === session.id ? (
                  <div className="photo-area">
                    <div className="photo-upload-row">
                      <div className="photo-upload-actions">
                        <label className="avatar-upload-btn" htmlFor={`session-photo-${session.id}`}>
                          {photoUploadingIds.includes(session.id) ? "Uploading..." : "Upload session photo"}
                        </label>
                        <input
                          id={`session-photo-${session.id}`}
                          className="avatar-upload-input"
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                          disabled={photoUploadingIds.includes(session.id)}
                          onChange={async (event) => {
                            const file = event.target.files?.[0];
                            if (!file) {
                              return;
                            }
                            await onUploadPhoto(session.id, file);
                            event.currentTarget.value = "";
                          }}
                        />
                        <label className="avatar-upload-btn" htmlFor={`forecast-photo-${session.id}`}>
                          {photoUploadingIds.includes(session.id) ? "Uploading..." : "Upload forecast screenshot"}
                        </label>
                        <input
                          id={`forecast-photo-${session.id}`}
                          className="avatar-upload-input"
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                          disabled={photoUploadingIds.includes(session.id)}
                          onChange={async (event) => {
                            const file = event.target.files?.[0];
                            if (!file) {
                              return;
                            }
                            await onUploadPhoto(session.id, file);
                            event.currentTarget.value = "";
                          }}
                        />
                      </div>
                    </div>
                    {photoLoadingIds.includes(session.id) ? (
                      <p className="tiny">Loading photos...</p>
                    ) : null}
                    <div className="photo-grid">
                      {(photosBySession[session.id] ?? []).map((photo) => (
                        <a href={photo.public_url} target="_blank" rel="noreferrer" key={photo.id}>
                          <img
                            src={photo.public_url}
                            alt={`Session photo by @${photo.uploaded_by_username}`}
                          />
                        </a>
                      ))}
                    </div>
                  </div>
                ) : null}
    </div>
  );

  const renderColumn = (
    title: string,
    groups: Array<[string, SurfSession[]]>,
    emptyText: string
  ) => (
    <section className="card day-block session-column">
      <h3>{title}</h3>
      {groups.length === 0 ? <p className="status">{emptyText}</p> : null}
      <div className="calendar-wrap">
        {groups.map(([date, items]) => (
          <article className="card day-block" key={`${title}:${date}`}>
            <h3>{date}</h3>
            <div className="session-stack">{items.map((session) => renderSessionCard(session))}</div>
          </article>
        ))}
      </div>
    </section>
  );

  return (
    <section className="calendar-split">
      {renderColumn("Completed Sessions", completedGroups, "No completed sessions yet.")}
      {renderColumn("Planned Sessions", plannedGroups, "No planned sessions yet. Plan your first dawn patrol.")}
    </section>
  );
}
