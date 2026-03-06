export interface AuthState {
  token: string | null;
  username: string | null;
  loading: boolean;
  error: string | null;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  username: string;
}

export interface LoginPayload {
  username: string;
  password: string;
}

export type RegisterPayload = LoginPayload;
