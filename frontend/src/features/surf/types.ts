export type GroupRole = "admin" | "member";
export type SessionLevel = "beginner" | "intermediate" | "advanced" | "mixed";
export type RSVPStatus = "going" | "maybe" | "not_going";

export interface SurfGroup {
  id: number;
  name: string;
  description: string;
  role: GroupRole;
  created_at: string;
}

export interface SurfInvite {
  code: string;
  status: string;
  expires_at: string;
}

export interface FriendSummary {
  id: number;
  username: string;
  telegram_username: string | null;
}

export interface SurfSession {
  id: number;
  group_id: number;
  spot_name: string;
  session_date: string;
  meeting_time: string | null;
  level: SessionLevel;
  forecast_note: string;
  logistics_note: string;
  created_at: string;
  my_rsvp: RSVPStatus | null;
  is_completed: boolean;
  completed_at: string | null;
  can_complete: boolean;
  average_rating: number | null;
  rating_count: number;
  forecast_snapshot: SessionForecastSnapshot | null;
}

export interface SessionForecastSnapshot {
  provider: string | null;
  target_time: string | null;
  wave_height_m: number | null;
  wave_direction_deg: number | null;
  wave_direction_cardinal: string | null;
  wave_period_s: number | null;
  wind_speed_kmh: number | null;
  wind_direction_deg: number | null;
  wind_direction_cardinal: string | null;
  water_temperature_c: number | null;
  sea_level_m: number | null;
  tide_level: string | null;
  tide_trend: string | null;
  summary: string | null;
}

export interface SessionReport {
  id: number;
  session_id: number;
  username: string;
  wave_score: number;
  crowd_score: number;
  wind_score: number;
  note: string;
  created_at: string;
}

export interface SessionFeedback {
  id: number;
  session_id: number;
  username: string;
  stars: number | null;
  comment: string;
  updated_at: string;
}

export interface SessionPhoto {
  id: number;
  session_id: number;
  uploaded_by_username: string;
  public_url: string;
  content_type: string;
  file_size_bytes: number;
  created_at: string;
}

export interface SessionInvite {
  id: number;
  session_id: number;
  status: string;
  invited_username: string | null;
  invited_telegram_username: string | null;
  invite_token: string | null;
  created_at: string;
}

export interface InboxItem {
  id: number;
  item_type: string;
  title: string;
  body: string;
  is_read: boolean;
  related_invite_id: number | null;
  related_friend_request_id: number | null;
  related_group_member_invite_id: number | null;
  related_group_id: number | null;
  related_session_id: number | null;
  related_user_id: number | null;
  related_username: string | null;
  action_status: string;
  action_required: boolean;
  created_at: string;
}

export interface GroupCreatePayload {
  name: string;
  description: string;
}

export interface SessionCreatePayload {
  spot_name: string;
  session_date: string;
  meeting_time: string | null;
  level: SessionLevel;
  forecast_note: string;
  logistics_note: string;
  invite_usernames?: string[];
  invite_telegram_usernames?: string[];
}

export interface ReportCreatePayload {
  wave_score: number;
  crowd_score: number;
  wind_score: number;
  note: string;
}

export interface SurfState {
  groups: SurfGroup[];
  friends: FriendSummary[];
  selectedGroupId: number | null;
  sessions: SurfSession[];
  reportsBySession: Record<number, SessionReport[]>;
  feedbackBySession: Record<number, SessionFeedback[]>;
  photosBySession: Record<number, SessionPhoto[]>;
  invitesBySession: Record<number, SessionInvite[]>;
  invitesByGroup: Record<number, SurfInvite | null>;
  inbox: InboxItem[];
  loadingGroups: boolean;
  loadingFriends: boolean;
  loadingSessions: boolean;
  creatingGroup: boolean;
  joiningByCode: boolean;
  creatingSession: boolean;
  creatingInvite: boolean;
  sendingSessionInvite: boolean;
  acceptingInviteIds: number[];
  decliningInviteIds: number[];
  loadingInbox: boolean;
  rsvpLoadingIds: number[];
  reportLoadingIds: number[];
  feedbackLoadingIds: number[];
  feedbackSavingIds: number[];
  completingSessionIds: number[];
  photoLoadingIds: number[];
  photoUploadingIds: number[];
  error: string | null;
}
