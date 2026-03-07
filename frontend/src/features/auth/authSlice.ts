import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";
import { api, clearAuthToken, setAuthToken } from "../../shared/api";
import type {
  AuthResponse,
  AuthState,
  LoginPayload,
  RegisterPayload,
  RegisterResponse
} from "./types";

const initialState: AuthState = {
  token: null,
  username: null,
  loading: false,
  sessionChecked: false,
  error: null,
  registerMessage: null,
  registerBotLink: null
};

const applyAuth = (payload: AuthResponse) => {
  setAuthToken(payload.access_token);
};

const authErrorMessage = (error: unknown, fallback: string): string => {
  if (!axios.isAxiosError(error)) {
    return fallback;
  }
  if (error.code === "ECONNABORTED" || error.message.toLowerCase().includes("timeout")) {
    return "Backend is waking up on free tier. Please retry in 10-20 seconds.";
  }
  return (error.response?.data as { detail?: string } | undefined)?.detail ?? fallback;
};

export const login = createAsyncThunk(
  "auth/login",
  async (payload: LoginPayload, { rejectWithValue }) => {
    try {
      const response = await api.post<AuthResponse>("/auth/login", payload);
      applyAuth(response.data);
      return response.data;
    } catch (error) {
      return rejectWithValue(authErrorMessage(error, "Login failed"));
    }
  }
);

export const restoreSession = createAsyncThunk(
  "auth/restoreSession",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.post<AuthResponse>("/auth/refresh");
      applyAuth(response.data);
      return response.data;
    } catch {
      clearAuthToken();
      return rejectWithValue("Session restore failed");
    }
  }
);

export const register = createAsyncThunk(
  "auth/register",
  async (payload: RegisterPayload, { rejectWithValue }) => {
    try {
      const response = await api.post<RegisterResponse>("/auth/register", payload);
      return response.data;
    } catch (error) {
      return rejectWithValue(authErrorMessage(error, "Registration failed"));
    }
  }
);

export const logoutSession = createAsyncThunk("auth/logoutSession", async () => {
  try {
    await api.post("/auth/logout");
  } catch {
    // Ignore network failures here; local session is still cleared on client.
  }
});

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    applySession: (state, action: { payload: AuthResponse }) => {
      state.token = action.payload.access_token;
      state.username = action.payload.username;
      state.sessionChecked = true;
      state.error = null;
      applyAuth(action.payload);
    },
    logout: (state) => {
      state.token = null;
      state.username = null;
      state.sessionChecked = true;
      state.error = null;
      state.registerMessage = null;
      state.registerBotLink = null;
      clearAuthToken();
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(restoreSession.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(restoreSession.fulfilled, (state, action) => {
        state.loading = false;
        state.sessionChecked = true;
        state.token = action.payload.access_token;
        state.username = action.payload.username;
      })
      .addCase(restoreSession.rejected, (state) => {
        state.loading = false;
        state.sessionChecked = true;
        state.token = null;
        state.username = null;
      })
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.sessionChecked = true;
        state.error = null;
        state.registerMessage = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        state.token = action.payload.access_token;
        state.username = action.payload.username;
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) ?? action.error.message ?? "Login failed";
      })
      .addCase(register.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.registerMessage = null;
        state.registerBotLink = null;
      })
      .addCase(register.fulfilled, (state, action) => {
        state.loading = false;
        state.registerMessage = action.payload.message;
        state.registerBotLink = action.payload.bot_link;
      })
      .addCase(register.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) ?? action.error.message ?? "Registration failed";
      });
  }
});

export const { logout, applySession } = authSlice.actions;
export default authSlice.reducer;
