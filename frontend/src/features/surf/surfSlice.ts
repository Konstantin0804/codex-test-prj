import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { api } from "../../shared/api";
import type {
  FriendSummary,
  GroupCreatePayload,
  InboxItem,
  ReportCreatePayload,
  SessionInvite,
  SessionCreatePayload,
  SessionReport,
  SurfGroup,
  SurfInvite,
  SurfSession,
  SurfState
} from "./types";

const initialState: SurfState = {
  groups: [],
  friends: [],
  selectedGroupId: null,
  sessions: [],
  reportsBySession: {},
  invitesBySession: {},
  invitesByGroup: {},
  inbox: [],
  loadingGroups: false,
  loadingFriends: false,
  loadingSessions: false,
  creatingGroup: false,
  joiningByCode: false,
  creatingSession: false,
  creatingInvite: false,
  sendingSessionInvite: false,
  acceptingInviteIds: [],
  loadingInbox: false,
  rsvpLoadingIds: [],
  reportLoadingIds: [],
  error: null
};

export const fetchGroups = createAsyncThunk("surf/fetchGroups", async () => {
  const response = await api.get<SurfGroup[]>("/surf/groups");
  return response.data;
});

export const fetchFriends = createAsyncThunk("surf/fetchFriends", async () => {
  const response = await api.get<FriendSummary[]>("/surf/friends");
  return response.data;
});

export const createGroup = createAsyncThunk(
  "surf/createGroup",
  async (payload: GroupCreatePayload) => {
    const response = await api.post<SurfGroup>("/surf/groups", payload);
    return response.data;
  }
);

export const joinByInvite = createAsyncThunk("surf/joinByInvite", async (code: string) => {
  const response = await api.post<SurfGroup>("/surf/invites/join", { code });
  return response.data;
});

export const createInvite = createAsyncThunk("surf/createInvite", async (groupId: number) => {
  const response = await api.post<SurfInvite>(`/surf/groups/${groupId}/invites`);
  return { groupId, invite: response.data };
});

export const fetchSessions = createAsyncThunk("surf/fetchSessions", async (groupId: number) => {
  const response = await api.get<SurfSession[]>(`/surf/groups/${groupId}/sessions`);
  return response.data;
});

export const createSession = createAsyncThunk(
  "surf/createSession",
  async ({ groupId, payload }: { groupId: number; payload: SessionCreatePayload }) => {
    const response = await api.post<SurfSession>(`/surf/groups/${groupId}/sessions`, payload);
    return response.data;
  }
);

export const sendSessionInvite = createAsyncThunk(
  "surf/sendSessionInvite",
  async ({
    sessionId,
    username,
    telegram_username
  }: {
    sessionId: number;
    username?: string;
    telegram_username?: string;
  }) => {
    const response = await api.post<SessionInvite>(`/surf/sessions/${sessionId}/invite`, {
      username,
      telegram_username
    });
    return response.data;
  }
);

export const fetchInbox = createAsyncThunk("surf/fetchInbox", async () => {
  const response = await api.get<InboxItem[]>("/surf/inbox");
  return response.data;
});

export const markInboxRead = createAsyncThunk("surf/markInboxRead", async (itemId: number) => {
  const response = await api.patch<InboxItem>(`/surf/inbox/${itemId}/read`);
  return response.data;
});

export const acceptInvite = createAsyncThunk("surf/acceptInvite", async (inviteId: number) => {
  const response = await api.post<SessionInvite>(`/surf/invites/${inviteId}/accept`);
  return response.data;
});

export const setRsvp = createAsyncThunk(
  "surf/setRsvp",
  async ({ sessionId, status }: { sessionId: number; status: "going" | "maybe" | "not_going" }) => {
    await api.patch(`/surf/sessions/${sessionId}/rsvp`, { status, transport_note: "" });
    return { sessionId, status };
  }
);

export const fetchReports = createAsyncThunk("surf/fetchReports", async (sessionId: number) => {
  const response = await api.get<SessionReport[]>(`/surf/sessions/${sessionId}/reports`);
  return { sessionId, reports: response.data };
});

export const createReport = createAsyncThunk(
  "surf/createReport",
  async ({ sessionId, payload }: { sessionId: number; payload: ReportCreatePayload }) => {
    const response = await api.post<SessionReport>(`/surf/sessions/${sessionId}/reports`, payload);
    return response.data;
  }
);

const surfSlice = createSlice({
  name: "surf",
  initialState,
  reducers: {
    selectGroup(state, action: PayloadAction<number>) {
      state.selectedGroupId = action.payload;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchGroups.pending, (state) => {
        state.loadingGroups = true;
        state.error = null;
      })
      .addCase(fetchGroups.fulfilled, (state, action) => {
        state.loadingGroups = false;
        state.groups = action.payload;
        if (action.payload.length > 0 && !state.selectedGroupId) {
          state.selectedGroupId = action.payload[0].id;
        }
        if (
          state.selectedGroupId &&
          !action.payload.some((group) => group.id === state.selectedGroupId)
        ) {
          state.selectedGroupId = action.payload[0]?.id ?? null;
        }
      })
      .addCase(fetchGroups.rejected, (state, action) => {
        state.loadingGroups = false;
        state.error = action.error.message ?? "Failed to load groups";
      })
      .addCase(fetchFriends.pending, (state) => {
        state.loadingFriends = true;
      })
      .addCase(fetchFriends.fulfilled, (state, action) => {
        state.loadingFriends = false;
        state.friends = action.payload;
      })
      .addCase(fetchFriends.rejected, (state, action) => {
        state.loadingFriends = false;
        state.error = action.error.message ?? "Failed to load friends";
      })
      .addCase(createGroup.pending, (state) => {
        state.creatingGroup = true;
      })
      .addCase(createGroup.fulfilled, (state, action) => {
        state.creatingGroup = false;
        state.groups.unshift(action.payload);
        state.selectedGroupId = action.payload.id;
      })
      .addCase(createGroup.rejected, (state, action) => {
        state.creatingGroup = false;
        state.error = action.error.message ?? "Failed to create group";
      })
      .addCase(joinByInvite.pending, (state) => {
        state.joiningByCode = true;
      })
      .addCase(joinByInvite.fulfilled, (state, action) => {
        state.joiningByCode = false;
        if (!state.groups.some((group) => group.id === action.payload.id)) {
          state.groups.unshift(action.payload);
        }
        state.selectedGroupId = action.payload.id;
      })
      .addCase(joinByInvite.rejected, (state, action) => {
        state.joiningByCode = false;
        state.error = action.error.message ?? "Failed to join group";
      })
      .addCase(createInvite.pending, (state) => {
        state.creatingInvite = true;
      })
      .addCase(createInvite.fulfilled, (state, action) => {
        state.creatingInvite = false;
        state.invitesByGroup[action.payload.groupId] = action.payload.invite;
      })
      .addCase(createInvite.rejected, (state, action) => {
        state.creatingInvite = false;
        state.error = action.error.message ?? "Failed to create invite";
      })
      .addCase(sendSessionInvite.pending, (state) => {
        state.sendingSessionInvite = true;
      })
      .addCase(sendSessionInvite.fulfilled, (state, action) => {
        state.sendingSessionInvite = false;
        state.invitesBySession[action.payload.session_id] = [
          action.payload,
          ...(state.invitesBySession[action.payload.session_id] ?? [])
        ];
      })
      .addCase(sendSessionInvite.rejected, (state, action) => {
        state.sendingSessionInvite = false;
        state.error = action.error.message ?? "Failed to send session invite";
      })
      .addCase(fetchInbox.pending, (state) => {
        state.loadingInbox = true;
      })
      .addCase(fetchInbox.fulfilled, (state, action) => {
        state.loadingInbox = false;
        state.inbox = action.payload;
      })
      .addCase(fetchInbox.rejected, (state, action) => {
        state.loadingInbox = false;
        state.error = action.error.message ?? "Failed to load inbox";
      })
      .addCase(markInboxRead.fulfilled, (state, action) => {
        const index = state.inbox.findIndex((item) => item.id === action.payload.id);
        if (index >= 0) {
          state.inbox[index] = action.payload;
        }
      })
      .addCase(acceptInvite.pending, (state, action) => {
        state.acceptingInviteIds.push(action.meta.arg);
      })
      .addCase(acceptInvite.fulfilled, (state, action) => {
        state.acceptingInviteIds = state.acceptingInviteIds.filter((id) => id !== action.payload.id);
        state.inbox = state.inbox.map((item) =>
          item.related_invite_id === action.payload.id
            ? { ...item, is_read: true, title: `${item.title} (accepted)` }
            : item
        );
      })
      .addCase(acceptInvite.rejected, (state, action) => {
        state.acceptingInviteIds = state.acceptingInviteIds.filter((id) => id !== action.meta.arg);
        state.error = action.error.message ?? "Failed to accept invite";
      })
      .addCase(fetchSessions.pending, (state) => {
        state.loadingSessions = true;
      })
      .addCase(fetchSessions.fulfilled, (state, action) => {
        state.loadingSessions = false;
        state.sessions = action.payload;
      })
      .addCase(fetchSessions.rejected, (state, action) => {
        state.loadingSessions = false;
        state.error = action.error.message ?? "Failed to load sessions";
      })
      .addCase(createSession.pending, (state) => {
        state.creatingSession = true;
      })
      .addCase(createSession.fulfilled, (state, action) => {
        state.creatingSession = false;
        state.sessions.push(action.payload);
        state.sessions.sort((a, b) =>
          `${a.session_date}T${a.meeting_time ?? "23:59:59"}`.localeCompare(
            `${b.session_date}T${b.meeting_time ?? "23:59:59"}`
          )
        );
      })
      .addCase(createSession.rejected, (state, action) => {
        state.creatingSession = false;
        state.error = action.error.message ?? "Failed to create session";
      })
      .addCase(setRsvp.pending, (state, action) => {
        state.rsvpLoadingIds.push(action.meta.arg.sessionId);
      })
      .addCase(setRsvp.fulfilled, (state, action) => {
        state.rsvpLoadingIds = state.rsvpLoadingIds.filter((id) => id !== action.payload.sessionId);
        const target = state.sessions.find((session) => session.id === action.payload.sessionId);
        if (target) {
          target.my_rsvp = action.payload.status;
        }
      })
      .addCase(setRsvp.rejected, (state, action) => {
        state.rsvpLoadingIds = state.rsvpLoadingIds.filter((id) => id !== action.meta.arg.sessionId);
        state.error = action.error.message ?? "Failed to set RSVP";
      })
      .addCase(fetchReports.fulfilled, (state, action) => {
        state.reportsBySession[action.payload.sessionId] = action.payload.reports;
      })
      .addCase(createReport.pending, (state, action) => {
        state.reportLoadingIds.push(action.meta.arg.sessionId);
      })
      .addCase(createReport.fulfilled, (state, action) => {
        state.reportLoadingIds = state.reportLoadingIds.filter((id) => id !== action.payload.session_id);
        state.reportsBySession[action.payload.session_id] = [
          action.payload,
          ...(state.reportsBySession[action.payload.session_id] ?? [])
        ];
      })
      .addCase(createReport.rejected, (state, action) => {
        state.reportLoadingIds = state.reportLoadingIds.filter((id) => id !== action.meta.arg.sessionId);
        state.error = action.error.message ?? "Failed to save report";
      });
  }
});

export const { selectGroup } = surfSlice.actions;
export default surfSlice.reducer;
