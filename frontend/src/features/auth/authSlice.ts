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

const savedToken = localStorage.getItem("pulseboard_token");
const savedUsername = localStorage.getItem("pulseboard_username");

const initialState: AuthState = {
  token: savedToken,
  username: savedUsername,
  loading: false,
  error: null,
  registerMessage: null,
  registerBotLink: null
};

const persistAuth = (payload: AuthResponse) => {
  localStorage.setItem("pulseboard_token", payload.access_token);
  localStorage.setItem("pulseboard_username", payload.username);
  setAuthToken(payload.access_token);
};

export const login = createAsyncThunk(
  "auth/login",
  async (payload: LoginPayload, { rejectWithValue }) => {
    try {
      const response = await api.post<AuthResponse>("/auth/login", payload);
      persistAuth(response.data);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        return rejectWithValue(error.response?.data?.detail ?? "Login failed");
      }
      return rejectWithValue("Login failed");
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
      if (axios.isAxiosError(error)) {
        return rejectWithValue(error.response?.data?.detail ?? "Registration failed");
      }
      return rejectWithValue("Registration failed");
    }
  }
);

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    logout: (state) => {
      state.token = null;
      state.username = null;
      state.error = null;
      state.registerMessage = null;
      state.registerBotLink = null;
      localStorage.removeItem("pulseboard_token");
      localStorage.removeItem("pulseboard_username");
      clearAuthToken();
    },
    hydrateAuth: (state) => {
      if (state.token) {
        setAuthToken(state.token);
      }
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.loading = true;
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

export const { logout, hydrateAuth } = authSlice.actions;
export default authSlice.reducer;
