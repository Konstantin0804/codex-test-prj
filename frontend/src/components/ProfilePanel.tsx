import { FormEvent, useEffect, useMemo, useState } from "react";
import { api } from "../shared/api";
import { SURF_SPOTS } from "../shared/surfSpots";
import {
  browserSupportsPasskeys,
  prepareRegistrationOptions,
  serializeRegistrationCredential,
} from "../shared/passkey";

type SurfLevel = "beginner" | "beginner_plus" | "intermediate" | "advanced" | "pro";

interface Profile {
  username: string;
  telegram_username: string | null;
  age: number | null;
  city: string | null;
  surfboard: string | null;
  surf_level: SurfLevel | null;
  has_car: boolean | null;
  car_seats: number | null;
  phone_number: string | null;
  favorite_spots: string[];
  avatar_url: string | null;
}

interface PasskeyStatus {
  count: number;
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
  const [hasCar, setHasCar] = useState<"" | "yes" | "no">("");
  const [carSeats, setCarSeats] = useState<number>(0);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [favoriteSpots, setFavoriteSpots] = useState<string[]>([]);
  const [spotQuery, setSpotQuery] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarInputLabel, setAvatarInputLabel] = useState("");
  const [passkeyBusy, setPasskeyBusy] = useState(false);
  const [passkeyCount, setPasskeyCount] = useState(0);

  useEffect(() => {
    const load = async () => {
      try {
        const [profileRes, passkeyRes] = await Promise.all([
          api.get<Profile>("/auth/profile"),
          api.get<PasskeyStatus>("/auth/passkeys/status"),
        ]);
        const profile = profileRes.data;
        setUsername(profile.username);
        setTelegramUsername(profile.telegram_username ?? "");
        setAge(profile.age ? String(profile.age) : "");
        setCity(profile.city ?? "");
        setSurfboard(profile.surfboard ?? "");
        setSurfLevel(profile.surf_level ?? "");
        setHasCar(profile.has_car === null ? "" : profile.has_car ? "yes" : "no");
        setCarSeats(profile.car_seats ?? 0);
        setPhoneNumber(profile.phone_number ?? "");
        setFavoriteSpots(profile.favorite_spots ?? []);
        setAvatarUrl(profile.avatar_url ?? null);
        setPasskeyCount(passkeyRes.data.count ?? 0);
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
  const validCarSeats = carSeats >= 0 && carSeats <= 6;
  const canSubmit = validAge && validCity && validBoard && validPhone && validFavoriteSpots && validCarSeats;

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
      if (hasCar !== "") {
        payload.has_car = hasCar === "yes";
        payload.car_seats = hasCar === "yes" ? carSeats : 0;
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

  const registerPasskey = async () => {
    setError(null);
    setSuccess(null);
    if (!browserSupportsPasskeys()) {
      setError("Passkeys are not supported in this browser.");
      return;
    }
    setPasskeyBusy(true);
    try {
      const optionsRes = await api.post<{ options: any }>("/auth/passkeys/register/options");
      const publicKey = prepareRegistrationOptions(optionsRes.data.options);
      const credential = (await navigator.credentials.create({
        publicKey,
      })) as PublicKeyCredential | null;
      if (!credential) {
        setError("Passkey registration was cancelled.");
        return;
      }
      await api.post("/auth/passkeys/register/verify", {
        credential: serializeRegistrationCredential(credential),
      });
      setPasskeyCount((value) => value + 1);
      setSuccess("Face ID / Touch ID enabled on this device.");
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Failed to register passkey");
    } finally {
      setPasskeyBusy(false);
    }
  };

  const deletePasskeys = async () => {
    setError(null);
    setSuccess(null);
    setPasskeyBusy(true);
    try {
      const response = await api.delete<{ removed: number }>("/auth/passkeys");
      setPasskeyCount(0);
      setSuccess(`Removed ${response.data.removed ?? 0} passkey(s).`);
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Failed to remove passkeys");
    } finally {
      setPasskeyBusy(false);
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

        <div className="avatar-row">
          <div className="avatar-preview-wrap">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="profile-avatar-preview" />
            ) : (
              <div className="profile-avatar-placeholder">No avatar</div>
            )}
          </div>
          <div className="avatar-controls">
            <p className="tiny">
              {avatarUrl ? "Avatar already set. You can replace it." : "No avatar yet. Upload one."}
            </p>
            <label className="avatar-upload-btn" htmlFor="avatar-upload-input">
              {avatarUrl ? "Replace avatar" : "Upload avatar"}
            </label>
            <input
              id="avatar-upload-input"
              className="avatar-upload-input"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  setAvatarInputLabel(file.name);
                  void uploadAvatar(file);
                }
              }}
            />
            <p className="tiny">{avatarInputLabel || "JPG, PNG, WEBP, HEIC"}</p>
          </div>
        </div>
        {uploadingAvatar ? <p className="tiny">Uploading avatar...</p> : null}

        <div className="row-2 about-top-row">
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
        </div>
        <div className="row-3 about-surf-row">
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
          <label>
            Car available
            <select
              value={hasCar}
              onChange={(event) => {
                const next = event.target.value as "" | "yes" | "no";
                setHasCar(next);
                if (next !== "yes") {
                  setCarSeats(0);
                }
              }}
            >
              <option value="">Not set</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </label>
          <label>
            Passenger seats (0-6)
            <select
              value={carSeats}
              onChange={(event) => setCarSeats(Number(event.target.value))}
              disabled={hasCar !== "yes"}
            >
              {Array.from({ length: 7 }, (_, idx) => (
                <option key={idx} value={idx}>
                  {idx}
                </option>
              ))}
            </select>
          </label>
        </div>
        {!validAge && age.length > 0 ? <p className="tiny error-text">Age: 8 to 90.</p> : null}
        {!validCity && city.trim().length > 0 ? (
          <p className="tiny error-text">City: minimum 2 characters.</p>
        ) : null}
        {!validCarSeats ? <p className="tiny error-text">Passenger seats: from 0 to 6.</p> : null}

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
        <div className="row-2">
          <button className="ghost" type="button" disabled={passkeyBusy} onClick={() => void registerPasskey()}>
            {passkeyBusy ? "Setting up passkey..." : "Enable Face ID / Touch ID"}
          </button>
          <button
            className="ghost"
            type="button"
            disabled={passkeyBusy || passkeyCount <= 0}
            onClick={() => void deletePasskeys()}
          >
            Remove passkeys
          </button>
        </div>
        <p className="tiny">
          Registered passkeys: <strong>{passkeyCount}</strong>
        </p>
        <button type="submit" disabled={saving || !canSubmit}>
          {saving ? "Saving..." : "Save profile"}
        </button>
      </form>
    </section>
  );
}
