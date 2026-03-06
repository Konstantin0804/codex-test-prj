import axios from "axios";

const baseURL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api/v1";

export const api = axios.create({
  baseURL,
  timeout: 10000
});

export const setAuthToken = (token: string) => {
  api.defaults.headers.common.Authorization = `Bearer ${token}`;
};

export const clearAuthToken = () => {
  delete api.defaults.headers.common.Authorization;
};

const bootstrapToken = localStorage.getItem("pulseboard_token");
if (bootstrapToken) {
  setAuthToken(bootstrapToken);
}
