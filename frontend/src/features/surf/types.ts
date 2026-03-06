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
}

export interface ReportCreatePayload {
  wave_score: number;
  crowd_score: number;
  wind_score: number;
  note: string;
}

export interface SurfState {
  groups: SurfGroup[];
  selectedGroupId: number | null;
  sessions: SurfSession[];
  reportsBySession: Record<number, SessionReport[]>;
  invitesBySession: Record<number, SessionInvite[]>;
  invitesByGroup: Record<number, SurfInvite | null>;
  inbox: InboxItem[];
  loadingGroups: boolean;
  loadingSessions: boolean;
  creatingGroup: boolean;
  joiningByCode: boolean;
  creatingSession: boolean;
  creatingInvite: boolean;
  sendingSessionInvite: boolean;
  acceptingInviteIds: number[];
  loadingInbox: boolean;
  rsvpLoadingIds: number[];
  reportLoadingIds: number[];
  error: string | null;
}
