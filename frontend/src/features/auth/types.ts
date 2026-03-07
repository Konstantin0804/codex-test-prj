export interface AuthState {
  token: string | null;
  username: string | null;
  loading: boolean;
  sessionChecked: boolean;
  error: string | null;
  registerMessage: string | null;
  registerBotLink: string | null;
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

export interface RegisterPayload extends LoginPayload {
  telegram_username: string;
  invite_token?: string;
}

export interface RegisterResponse {
  status: string;
  message: string;
  bot_link: string | null;
}
