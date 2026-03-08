import axios from "axios";
import type { AuthResponse } from "../features/auth/types";

const baseURL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api/v1";

export const api = axios.create({
  baseURL,
  timeout: 30000,
  withCredentials: true
});

export const setAuthToken = (token: string) => {
  api.defaults.headers.common.Authorization = `Bearer ${token}`;
};

export const clearAuthToken = () => {
  delete api.defaults.headers.common.Authorization;
};

const refreshClient = axios.create({
  baseURL,
  timeout: 30000,
  withCredentials: true
});

let refreshPromise: Promise<AuthResponse> | null = null;

const notifyAuthRefreshed = (payload: AuthResponse) => {
  window.dispatchEvent(new CustomEvent("pulseboard:auth-refreshed", { detail: payload }));
};

const notifyAuthRequired = () => {
  window.dispatchEvent(new Event("pulseboard:auth-required"));
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error?.config as { _retry?: boolean; url?: string; headers?: Record<string, string> };
    const statusCode = error?.response?.status;
    const requestUrl = String(originalRequest?.url ?? "");

    if (statusCode !== 401 || !originalRequest) {
      return Promise.reject(error);
    }

    if (
      requestUrl.includes("/auth/login") ||
      requestUrl.includes("/auth/register") ||
      requestUrl.includes("/auth/refresh") ||
      requestUrl.includes("/auth/password/") ||
      requestUrl.includes("/auth/passkeys/auth/")
    ) {
      notifyAuthRequired();
      return Promise.reject(error);
    }

    if (originalRequest._retry) {
      notifyAuthRequired();
      return Promise.reject(error);
    }

    originalRequest._retry = true;
    try {
      if (!refreshPromise) {
        refreshPromise = refreshClient.post<AuthResponse>("/auth/refresh").then((response) => response.data);
      }
      const refreshed = await refreshPromise;
      setAuthToken(refreshed.access_token);
      notifyAuthRefreshed(refreshed);
      originalRequest.headers = {
        ...(originalRequest.headers ?? {}),
        Authorization: `Bearer ${refreshed.access_token}`
      };
      return await api(originalRequest);
    } catch (refreshError: any) {
      const refreshStatus = refreshError?.response?.status;
      // Only force re-auth when refresh token is definitely invalid/expired.
      if (refreshStatus === 401 || refreshStatus === 403) {
        clearAuthToken();
        notifyAuthRequired();
      }
      return Promise.reject(error);
    } finally {
      refreshPromise = null;
    }
  }
);
