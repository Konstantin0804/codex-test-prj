import { FormEvent, useMemo, useState } from "react";
import type { SessionReport, SurfSession } from "../features/surf/types";

interface Props {
  sessions: SurfSession[];
  loading: boolean;
  rsvpLoadingIds: number[];
  reportLoadingIds: number[];
  reportsBySession: Record<number, SessionReport[]>;
  onRsvp: (sessionId: number, status: "going" | "maybe" | "not_going") => Promise<void>;
  onCreateReport: (
    sessionId: number,
    payload: { wave_score: number; crowd_score: number; wind_score: number; note: string }
  ) => Promise<void>;
  onLoadReports: (sessionId: number) => Promise<void>;
}

export function SurfCalendar({
  sessions,
  loading,
  rsvpLoadingIds,
  reportLoadingIds,
  reportsBySession,
  onRsvp,
  onCreateReport,
  onLoadReports
}: Props) {
  const [openReportFor, setOpenReportFor] = useState<number | null>(null);
  const [formState, setFormState] = useState({ wave_score: 7, crowd_score: 6, wind_score: 7, note: "" });

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
              </div>
            ))}
          </div>
        </article>
      ))}
    </section>
  );
}
