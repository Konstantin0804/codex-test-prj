import { FormEvent, useEffect, useMemo, useState } from "react";
import { api } from "../shared/api";
import { SURF_SPOTS } from "../shared/surfSpots";

type SurfLevel = "beginner" | "beginner_plus" | "intermediate" | "advanced" | "pro";

interface Profile {
  username: string;
  telegram_username: string | null;
  age: number | null;
  city: string | null;
  surfboard: string | null;
  surf_level: SurfLevel | null;
  phone_number: string | null;
  favorite_spots: string[];
  avatar_url: string | null;
}

const LEVEL_LABELS: Record<SurfLevel, string> = {
  beginner: "Beginner",
  beginner_plus: "Beginner+",
  intermediate: "Intermediate",
  advanced: "Advanced",
  pro: "Pro"
};

function sanitizeInternationalPhoneInput(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "").slice(0, 15);
  return `${hasPlus ? "+" : ""}${digits}`;
}

interface Props {
  onClose: () => void;
  onAvatarChange: (avatarUrl: string | null) => void;
}

export function ProfilePanel({ onClose, onAvatarChange }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [username, setUsername] = useState("");
  const [telegramUsername, setTelegramUsername] = useState("");
  const [age, setAge] = useState("");
  const [city, setCity] = useState("");
  const [surfboard, setSurfboard] = useState("");
  const [surfLevel, setSurfLevel] = useState<SurfLevel | "">("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [favoriteSpots, setFavoriteSpots] = useState<string[]>([]);
  const [spotQuery, setSpotQuery] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await api.get<Profile>("/auth/profile");
        const profile = response.data;
        setUsername(profile.username);
        setTelegramUsername(profile.telegram_username ?? "");
        setAge(profile.age ? String(profile.age) : "");
        setCity(profile.city ?? "");
        setSurfboard(profile.surfboard ?? "");
        setSurfLevel(profile.surf_level ?? "");
        setPhoneNumber(profile.phone_number ?? "");
        setFavoriteSpots(profile.favorite_spots ?? []);
        setAvatarUrl(profile.avatar_url ?? null);
        onAvatarChange(profile.avatar_url ?? null);
      } catch {
        setError("Failed to load profile");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [onAvatarChange]);

  const ageNum = Number(age);
  const validAge = age.trim().length === 0 || (Number.isFinite(ageNum) && ageNum >= 8 && ageNum <= 90);
  const validCity = city.trim().length === 0 || city.trim().length >= 2;
  const validBoard = surfboard.trim().length === 0 || surfboard.trim().length >= 2;
  const phoneDigits = phoneNumber.replace(/\D/g, "");
  const validPhone =
    phoneNumber.trim().length === 0 ||
    (phoneNumber.trim().startsWith("+") && phoneDigits.length >= 6 && phoneDigits.length <= 15);
  const validFavoriteSpots = favoriteSpots.length <= 3;
  const canSubmit = validAge && validCity && validBoard && validPhone && validFavoriteSpots;

  const normalizedPhonePreview = useMemo(() => sanitizeInternationalPhoneInput(phoneNumber), [phoneNumber]);
  const filteredSpots = useMemo(() => {
    const query = spotQuery.trim().toLowerCase();
    return SURF_SPOTS.filter((spot) => {
      if (favoriteSpots.includes(spot.name)) {
        return false;
      }
      if (!query) {
        return true;
      }
      return (
        spot.name.toLowerCase().includes(query) ||
        spot.region.toLowerCase().includes(query)
      );
    }).slice(0, 8);
  }, [spotQuery, favoriteSpots]);

  const addFavoriteSpot = (spotName: string) => {
    if (favoriteSpots.includes(spotName) || favoriteSpots.length >= 3) {
      return;
    }
    setFavoriteSpots((prev) => [...prev, spotName]);
    setSpotQuery("");
  };

  const removeFavoriteSpot = (spotName: string) => {
    setFavoriteSpots((prev) => prev.filter((item) => item !== spotName));
  };

  const uploadAvatar = async (file: File) => {
    setUploadingAvatar(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("avatar", file);
      const response = await api.post<Profile>("/auth/profile/avatar", form);
      setAvatarUrl(response.data.avatar_url ?? null);
      onAvatarChange(response.data.avatar_url ?? null);
      setSuccess("Avatar updated");
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Failed to upload avatar");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!canSubmit) {
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const payload: Record<string, unknown> = {
        favorite_spots: favoriteSpots
      };
      if (age.trim().length > 0) {
        payload.age = ageNum;
      }
      if (city.trim().length > 0) {
        payload.city = city.trim();
      }
      if (surfboard.trim().length > 0) {
        payload.surfboard = surfboard.trim();
      }
      if (surfLevel) {
        payload.surf_level = surfLevel;
      }
      if (phoneNumber.trim().length > 0) {
        payload.phone_number = normalizedPhonePreview;
      }

      await api.patch("/auth/profile", payload);
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
      <div className="profile-head">
        <h2>About Me</h2>
        <button className="ghost" type="button" onClick={onClose}>
          Close
        </button>
      </div>
      <form className="profile-form" onSubmit={submit}>
        <div className="row-2">
          <label>
            Username (login)
            <input value={username} disabled />
          </label>
          <label>
            Telegram
            <input value={telegramUsername} disabled />
          </label>
        </div>

        <label>
          Avatar
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                void uploadAvatar(file);
              }
            }}
          />
        </label>
        {avatarUrl ? (
          <img src={avatarUrl} alt="Avatar" className="profile-avatar-preview" />
        ) : null}
        {uploadingAvatar ? <p className="tiny">Uploading avatar...</p> : null}

        <div className="row-3">
          <label>
            Age
            <input
              type="number"
              min={8}
              max={90}
              value={age}
              onChange={(event) => setAge(event.target.value)}
            />
          </label>
          <label>
            City
            <input value={city} onChange={(event) => setCity(event.target.value)} />
          </label>
          <label>
            Surf Level
            <select
              value={surfLevel}
              onChange={(event) => setSurfLevel(event.target.value as SurfLevel | "")}
            >
              <option value="">Not set</option>
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
            Surfboard
            <input value={surfboard} onChange={(event) => setSurfboard(event.target.value)} />
          </label>
          <label>
            Phone
            <input
              value={phoneNumber}
              onChange={(event) => setPhoneNumber(sanitizeInternationalPhoneInput(event.target.value))}
              placeholder="+44 7700900123"
            />
          </label>
        </div>
        {!validBoard && surfboard.trim().length > 0 ? (
          <p className="tiny error-text">Surfboard: minimum 2 characters.</p>
        ) : null}
        {!validPhone && phoneNumber.length > 0 ? (
          <p className="tiny error-text">Phone format: +[country code][number], 6-15 digits.</p>
        ) : null}

        <label>
          TOP 3 favorite spots (0-3)
          <input
            value={spotQuery}
            onChange={(event) => setSpotQuery(event.target.value)}
            placeholder="Start typing spot name..."
            disabled={favoriteSpots.length >= 3}
          />
        </label>
        <div className="chip-row">
          {favoriteSpots.map((spot) => (
            <button key={spot} type="button" className="ghost" onClick={() => removeFavoriteSpot(spot)}>
              {spot} x
            </button>
          ))}
        </div>
        {spotQuery.trim().length > 0 && favoriteSpots.length < 3 ? (
          <div className="spot-suggest">
            {filteredSpots.length === 0 ? <p className="tiny">No matching spots.</p> : null}
            {filteredSpots.map((spot) => (
              <button
                key={spot.name}
                type="button"
                className="spot-option"
                onClick={() => addFavoriteSpot(spot.name)}
              >
                <span>{spot.name}</span>
                <span className="spot-option-meta">
                  <em>{spot.region}</em>
                </span>
              </button>
            ))}
          </div>
        ) : null}
        {!validFavoriteSpots ? (
          <p className="tiny error-text">Choose up to 3 favorite spots.</p>
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
