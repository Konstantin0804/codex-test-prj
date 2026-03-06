import { FormEvent, useMemo, useState } from "react";
import type { SessionPhoto, SessionReport, SurfSession } from "../features/surf/types";

interface Props {
  sessions: SurfSession[];
  loading: boolean;
  rsvpLoadingIds: number[];
  reportLoadingIds: number[];
  reportsBySession: Record<number, SessionReport[]>;
  photosBySession: Record<number, SessionPhoto[]>;
  sendingInvite: boolean;
  photoLoadingIds: number[];
  photoUploadingIds: number[];
  onSendInvite: (sessionId: number, username?: string, telegramUsername?: string) => Promise<void>;
  onRsvp: (sessionId: number, status: "going" | "maybe" | "not_going") => Promise<void>;
  onCreateReport: (
    sessionId: number,
    payload: { wave_score: number; crowd_score: number; wind_score: number; note: string }
  ) => Promise<void>;
  onLoadReports: (sessionId: number) => Promise<void>;
  onLoadPhotos: (sessionId: number) => Promise<void>;
  onUploadPhoto: (sessionId: number, file: File) => Promise<void>;
}

export function SurfCalendar({
  sessions,
  loading,
  rsvpLoadingIds,
  reportLoadingIds,
  reportsBySession,
  photosBySession,
  sendingInvite,
  photoLoadingIds,
  photoUploadingIds,
  onSendInvite,
  onRsvp,
  onCreateReport,
  onLoadReports,
  onLoadPhotos,
  onUploadPhoto
}: Props) {
  const [openReportFor, setOpenReportFor] = useState<number | null>(null);
  const [openPhotosFor, setOpenPhotosFor] = useState<number | null>(null);
  const [formState, setFormState] = useState({ wave_score: 7, crowd_score: 6, wind_score: 7, note: "" });
  const [inviteUsername, setInviteUsername] = useState("");
  const [inviteTelegram, setInviteTelegram] = useState("");
  const [photoFiles, setPhotoFiles] = useState<Record<number, File | null>>({});

  const grouped = useMemo(() => {
    const map: Record<string, SurfSession[]> = {};
    for (const session of sessions) {
      map[session.session_date] = map[session.session_date] ?? [];
      map[session.session_date].push(session);
    }
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [sessions]);

  const submitReport = async (event: FormEvent, sessionId: number) => {
    event.preventDefault();
    await onCreateReport(sessionId, formState);
    setFormState({ wave_score: 7, crowd_score: 6, wind_score: 7, note: "" });
  };

  if (loading) {
    return <p className="status">Loading sessions...</p>;
  }

  return (
    <section className="calendar-wrap">
      {grouped.length === 0 ? <p className="status">No sessions yet. Plan your first dawn patrol.</p> : null}
      {grouped.map(([date, items]) => (
        <article className="card day-block" key={date}>
          <h3>{date}</h3>
          <div className="session-stack">
            {items.map((session) => (
              <div className="session-card" key={session.id}>
                <div className="session-head">
                  <strong>{session.spot_name}</strong>
                  <span>{session.meeting_time ?? "No meet time"}</span>
                </div>
                <p className="tiny">Level: {session.level}</p>
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
                    onClick={async () => {
                      setOpenPhotosFor(openPhotosFor === session.id ? null : session.id);
                      await onLoadPhotos(session.id);
                    }}
                  >
                    Photos
                  </button>
                </div>
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
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                        onChange={(event) =>
                          setPhotoFiles((prev) => ({
                            ...prev,
                            [session.id]: event.target.files?.[0] ?? null
                          }))
                        }
                      />
                      <button
                        type="button"
                        disabled={
                          photoUploadingIds.includes(session.id) || !photoFiles[session.id]
                        }
                        onClick={async () => {
                          const file = photoFiles[session.id];
                          if (!file) {
                            return;
                          }
                          await onUploadPhoto(session.id, file);
                          setPhotoFiles((prev) => ({ ...prev, [session.id]: null }));
                        }}
                      >
                        {photoUploadingIds.includes(session.id) ? "Uploading..." : "Upload photo"}
                      </button>
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
            ))}
          </div>
        </article>
      ))}
    </section>
  );
}
