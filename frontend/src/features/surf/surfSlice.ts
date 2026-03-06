import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { api } from "../../shared/api";
import type {
  GroupCreatePayload,
  ReportCreatePayload,
  SessionCreatePayload,
  SessionReport,
  SurfGroup,
  SurfInvite,
  SurfSession,
  SurfState
} from "./types";

const initialState: SurfState = {
  groups: [],
  selectedGroupId: null,
  sessions: [],
  reportsBySession: {},
  invitesByGroup: {},
  loadingGroups: false,
  loadingSessions: false,
  creatingGroup: false,
  joiningByCode: false,
  creatingSession: false,
  creatingInvite: false,
  rsvpLoadingIds: [],
  reportLoadingIds: [],
  error: null
};

export const fetchGroups = createAsyncThunk("surf/fetchGroups", async () => {
  const response = await api.get<SurfGroup[]>("/surf/groups");
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
