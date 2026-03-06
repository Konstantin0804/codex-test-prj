import { FormEvent, useState } from "react";
import type { SessionLevel } from "../features/surf/types";

interface Props {
  disabled: boolean;
  onSubmit: (payload: {
    spot_name: string;
    session_date: string;
    meeting_time: string | null;
    level: SessionLevel;
    forecast_note: string;
    logistics_note: string;
  }) => Promise<void>;
}

export function SurfSessionComposer({ disabled, onSubmit }: Props) {
  const [spotName, setSpotName] = useState("");
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().slice(0, 10));
  const [meetingTime, setMeetingTime] = useState("06:30");
  const [level, setLevel] = useState<SessionLevel>("mixed");
  const [forecastNote, setForecastNote] = useState("");
  const [logisticsNote, setLogisticsNote] = useState("");

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
      logistics_note: logisticsNote
    });
    setSpotName("");
    setForecastNote("");
    setLogisticsNote("");
  };

  return (
    <form className="card surf-composer" onSubmit={submit}>
      <h2>Plan Session</h2>
      <label>
        Spot
        <input value={spotName} onChange={(event) => setSpotName(event.target.value)} />
      </label>
      <div className="row-3">
        <label>
          Date
          <input
            type="date"
            value={sessionDate}
            onChange={(event) => setSessionDate(event.target.value)}
          />
        </label>
        <label>
          Meet Time
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
      <button disabled={disabled} type="submit">
        {disabled ? "Saving..." : "Add to calendar"}
      </button>
    </form>
  );
}
