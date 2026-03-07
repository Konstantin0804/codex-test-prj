import { useEffect, useState } from "react";
import { api } from "../shared/api";

interface Profile {
  username: string;
  telegram_username: string | null;
  age: number | null;
  city: string | null;
  surfboard: string | null;
  surf_level: string | null;
  has_car: boolean | null;
  car_seats: number | null;
  phone_number: string | null;
  favorite_spots: string[];
  avatar_url: string | null;
}

interface Props {
  username: string;
  onClose: () => void;
}

export function UserProfileModal({ username, onClose }: Props) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await api.get<Profile>(`/auth/users/${username}/profile`);
        setProfile(response.data);
      } catch (err: any) {
        setError(err?.response?.data?.detail ?? "Failed to load user profile");
      }
    };
    void load();
  }, [username]);

  return (
    <div className="modal-backdrop">
      <div className="modal-wrap">
        <section className="card profile-panel">
          <div className="profile-head">
            <h2>User Profile</h2>
            <button className="ghost" type="button" onClick={onClose}>
              X
            </button>
          </div>
          {error ? <p className="error">{error}</p> : null}
          {!profile ? <p className="tiny">Loading...</p> : null}
          {profile ? (
            <div className="profile-readonly">
              <div className="profile-row">
                <strong>@{profile.username}</strong>
                {profile.avatar_url ? (
                  <img className="profile-avatar-preview" src={profile.avatar_url} alt="Avatar" />
                ) : null}
              </div>
              <p className="tiny">Telegram: {profile.telegram_username ? `@${profile.telegram_username}` : "-"}</p>
              <p className="tiny">Age: {profile.age ?? "-"}</p>
              <p className="tiny">City: {profile.city ?? "-"}</p>
              <p className="tiny">Surfboard: {profile.surfboard ?? "-"}</p>
              <p className="tiny">Level: {profile.surf_level ?? "-"}</p>
              <p className="tiny">Car: {profile.has_car === null ? "-" : profile.has_car ? "Yes" : "No"}</p>
              <p className="tiny">Passenger seats: {profile.car_seats ?? "-"}</p>
              <p className="tiny">Phone: {profile.phone_number ?? "-"}</p>
              <p className="tiny">
                Favorite spots: {profile.favorite_spots.length ? profile.favorite_spots.join(", ") : "-"}
              </p>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
