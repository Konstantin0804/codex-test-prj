import { useEffect, useState } from "react";
import { api } from "../shared/api";

interface Profile {
  username: string;
  telegram_username: string | null;
  birth_date: string | null;
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
  adminCrews: { id: number; name: string }[];
  onInviteToCrew: (groupId: number, username: string) => Promise<void>;
  onClose: () => void;
}

export function UserProfileModal({ username, adminCrews, onInviteToCrew, onClose }: Props) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedCrewId, setSelectedCrewId] = useState<number | null>(null);
  const [inviteStatus, setInviteStatus] = useState<string | null>(null);
  const [inviting, setInviting] = useState(false);

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
              <p className="tiny">Birth date: {profile.birth_date ?? "-"}</p>
              <p className="tiny">City: {profile.city ?? "-"}</p>
              <p className="tiny">Surfboard: {profile.surfboard ?? "-"}</p>
              <p className="tiny">Level: {profile.surf_level ?? "-"}</p>
              <p className="tiny">Car: {profile.has_car === null ? "-" : profile.has_car ? "Yes" : "No"}</p>
              <p className="tiny">Passenger seats: {profile.car_seats ?? "-"}</p>
              <p className="tiny">Phone: {profile.phone_number ?? "-"}</p>
              <p className="tiny">
                Favorite spots: {profile.favorite_spots.length ? profile.favorite_spots.join(", ") : "-"}
              </p>
              {adminCrews.length > 0 ? (
                <div className="invite-box">
                  <p className="tiny">Invite to crew</p>
                  <div className="invite-row">
                    <select
                      value={selectedCrewId ?? ""}
                      onChange={(event) => setSelectedCrewId(event.target.value ? Number(event.target.value) : null)}
                    >
                      <option value="">Select crew</option>
                      {adminCrews.map((crew) => (
                        <option key={crew.id} value={crew.id}>
                          {crew.name}
                        </option>
                      ))}
                    </select>
                    <button
                      className="ghost"
                      type="button"
                      disabled={!selectedCrewId || inviting}
                      onClick={async () => {
                        if (!selectedCrewId) {
                          return;
                        }
                        setInviting(true);
                        setInviteStatus(null);
                        try {
                          await onInviteToCrew(selectedCrewId, profile.username);
                          setInviteStatus("Crew invite sent");
                        } catch (err: any) {
                          setInviteStatus(err?.response?.data?.detail ?? "Failed to send crew invite");
                        } finally {
                          setInviting(false);
                        }
                      }}
                    >
                      {inviting ? "Sending..." : "Send invite"}
                    </button>
                  </div>
                  {inviteStatus ? <p className="tiny">{inviteStatus}</p> : null}
                </div>
              ) : null}
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
