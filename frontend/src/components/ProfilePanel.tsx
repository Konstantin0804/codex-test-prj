import { FormEvent, useEffect, useMemo, useState } from "react";
import { api } from "../shared/api";

type SurfLevel = "beginner" | "beginner_plus" | "intermediate" | "advanced" | "pro";

interface Profile {
  nickname: string | null;
  telegram_username: string | null;
  age: number | null;
  city: string | null;
  surfboard: string | null;
  surf_level: SurfLevel | null;
  phone_number: string | null;
}

const LEVEL_LABELS: Record<SurfLevel, string> = {
  beginner: "Beginner",
  beginner_plus: "Beginner+",
  intermediate: "Intermediate",
  advanced: "Advanced",
  pro: "Pro"
};

function formatPhoneEs(value: string): string {
  const digits = value.replace(/\D/g, "").slice(-9);
  if (digits.length === 0) {
    return "";
  }
  const g1 = digits.slice(0, 3);
  const g2 = digits.slice(3, 6);
  const g3 = digits.slice(6, 9);
  let formatted = "+34";
  if (g1) {
    formatted += ` ${g1}`;
  }
  if (g2) {
    formatted += `-${g2}`;
  }
  if (g3) {
    formatted += `-${g3}`;
  }
  return formatted;
}

export function ProfilePanel() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [nickname, setNickname] = useState("");
  const [telegramUsername, setTelegramUsername] = useState("");
  const [age, setAge] = useState("");
  const [city, setCity] = useState("");
  const [surfboard, setSurfboard] = useState("");
  const [surfLevel, setSurfLevel] = useState<SurfLevel>("beginner");
  const [phoneNumber, setPhoneNumber] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const response = await api.get<Profile>("/auth/profile");
        const profile = response.data;
        setNickname(profile.nickname ?? "");
        setTelegramUsername(profile.telegram_username ?? "");
        setAge(profile.age ? String(profile.age) : "");
        setCity(profile.city ?? "");
        setSurfboard(profile.surfboard ?? "");
        setSurfLevel(profile.surf_level ?? "beginner");
        setPhoneNumber(profile.phone_number ?? "");
      } catch {
        setError("Failed to load profile");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const ageNum = Number(age);
  const validNickname = nickname.trim().length >= 2;
  const validAge = Number.isFinite(ageNum) && ageNum >= 8 && ageNum <= 90;
  const validCity = city.trim().length >= 2;
  const validBoard = surfboard.trim().length >= 2;
  const phoneDigits = phoneNumber.replace(/\D/g, "");
  const validPhone = phoneDigits.length === 11 && phoneNumber.startsWith("+34");
  const canSubmit = validNickname && validAge && validCity && validBoard && validPhone;

  const normalizedPhonePreview = useMemo(() => formatPhoneEs(phoneNumber), [phoneNumber]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!canSubmit) {
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await api.patch("/auth/profile", {
        nickname: nickname.trim(),
        age: ageNum,
        city: city.trim(),
        surfboard: surfboard.trim(),
        surf_level: surfLevel,
        phone_number: normalizedPhonePreview
      });
      setPhoneNumber(normalizedPhonePreview);
      setSuccess("Profile saved");
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <section className="card profile-panel">
        <h2>About Me</h2>
        <p className="tiny">Loading profile...</p>
      </section>
    );
  }

  return (
    <section className="card profile-panel">
      <h2>About Me</h2>
      <form className="profile-form" onSubmit={submit}>
        <div className="row-2">
          <label>
            Nickname *
            <input value={nickname} onChange={(event) => setNickname(event.target.value)} />
          </label>
          <label>
            Telegram *
            <input value={telegramUsername} disabled />
          </label>
        </div>
        {!validNickname && nickname.trim().length > 0 ? (
          <p className="tiny error-text">Nickname: minimum 2 characters.</p>
        ) : null}

        <div className="row-3">
          <label>
            Age *
            <input
              type="number"
              min={8}
              max={90}
              value={age}
              onChange={(event) => setAge(event.target.value)}
            />
          </label>
          <label>
            City *
            <input value={city} onChange={(event) => setCity(event.target.value)} />
          </label>
          <label>
            Surf Level *
            <select
              value={surfLevel}
              onChange={(event) => setSurfLevel(event.target.value as SurfLevel)}
            >
              {Object.entries(LEVEL_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
        {!validAge && age.length > 0 ? <p className="tiny error-text">Age: 8 to 90.</p> : null}
        {!validCity && city.trim().length > 0 ? (
          <p className="tiny error-text">City: minimum 2 characters.</p>
        ) : null}

        <div className="row-2">
          <label>
            Surfboard *
            <input value={surfboard} onChange={(event) => setSurfboard(event.target.value)} />
          </label>
          <label>
            Phone *
            <input
              value={phoneNumber}
              onChange={(event) => setPhoneNumber(formatPhoneEs(event.target.value))}
              placeholder="+34 647-757-606"
            />
          </label>
        </div>
        {!validBoard && surfboard.trim().length > 0 ? (
          <p className="tiny error-text">Surfboard: minimum 2 characters.</p>
        ) : null}
        {!validPhone && phoneNumber.length > 0 ? (
          <p className="tiny error-text">Phone format: +34 647-757-606</p>
        ) : null}

        {error ? <p className="error">{error}</p> : null}
        {success ? <p className="status">{success}</p> : null}
        <button type="submit" disabled={saving || !canSubmit}>
          {saving ? "Saving..." : "Save profile"}
        </button>
      </form>
    </section>
  );
}
