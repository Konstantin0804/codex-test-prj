import { FormEvent, useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { login, register } from "../features/auth/authSlice";
import { api } from "../shared/api";

export function AuthPanel() {
  const dispatch = useAppDispatch();
  const { loading, error, registerMessage, registerBotLink } = useAppSelector(
    (state) => state.auth
  );
  const inviteToken = new URLSearchParams(window.location.search).get("invite") ?? undefined;
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [telegramUsername, setTelegramUsername] = useState("@");
  const [usernameState, setUsernameState] = useState<
    "idle" | "checking" | "available" | "taken" | "invalid"
  >("idle");

  useEffect(() => {
    if (mode !== "register") {
      return;
    }

    const normalized = username.trim().toLowerCase();
    if (normalized.length === 0) {
      setUsernameState("idle");
      return;
    }
    if (normalized.length < 3) {
      setUsernameState("invalid");
      return;
    }

    setUsernameState("checking");
    const timer = setTimeout(async () => {
      try {
        const response = await api.get<{ available: boolean }>("/auth/check-username", {
          params: { username: normalized }
        });
        setUsernameState(response.data.available ? "available" : "taken");
      } catch {
        setUsernameState("idle");
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [mode, username]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (mode === "login") {
      await dispatch(login({ username, password }));
      return;
    }
    const result = await dispatch(
      register({
        username,
        password,
        telegram_username: telegramUsername,
        invite_token: inviteToken
      })
    );
    if (register.fulfilled.match(result)) {
      setMode("login");
    }
  };

  const loginValid = username.trim().length >= 3 && password.length >= 8;
  const registerBaseValid =
    username.trim().length >= 3 &&
    password.length >= 8 &&
    telegramUsername.trim().replace(/^@/, "").length >= 3;
  const submitDisabled =
    loading || (mode === "login" ? !loginValid : !registerBaseValid || usernameState !== "available");

  return (
    <main className="layout auth-layout">
      <section className="card auth-card">
        <p className="eyebrow">Pulseboard Access</p>
        <h1>{mode === "login" ? "Sign In" : "Create Account"}</h1>
        <p>Use your account to coordinate surf sessions with your crew.</p>
        <form onSubmit={submit} className="auth-form">
          <label>
            Username
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              required
              minLength={3}
            />
          </label>
          {mode === "register" ? (
            <p
              className={`tiny ${
                usernameState === "taken" || usernameState === "invalid" ? "error-text" : ""
              }`}
            >
              {usernameState === "idle" ? "Use at least 3 characters." : null}
              {usernameState === "checking" ? "Checking availability..." : null}
              {usernameState === "available" ? "Username is available." : null}
              {usernameState === "taken" ? "This username is already taken." : null}
              {usernameState === "invalid" ? "Username must be at least 3 characters." : null}
            </p>
          ) : null}
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={8}
            />
          </label>
          {mode === "register" ? (
            <label>
              Telegram Username
              <input
                value={telegramUsername}
                onChange={(event) => setTelegramUsername(event.target.value)}
                required
                placeholder="@your_username"
              />
            </label>
          ) : null}
          {error ? <p className="error">{error}</p> : null}
          {registerMessage ? <p className="status">{registerMessage}</p> : null}
          {registerBotLink ? (
            <p className="status">
              Open bot:{" "}
              <a href={registerBotLink} target="_blank" rel="noreferrer">
                {registerBotLink}
              </a>
            </p>
          ) : null}
          <button type="submit" disabled={submitDisabled}>
            {loading ? "Please wait..." : mode === "login" ? "Sign in" : "Create account"}
          </button>
        </form>
        <button
          className="ghost"
          onClick={() => setMode((current) => (current === "login" ? "register" : "login"))}
        >
          {mode === "login" ? "Need an account? Register" : "Already have account? Login"}
        </button>
      </section>
    </main>
  );
}
