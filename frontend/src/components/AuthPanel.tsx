import { FormEvent, useState } from "react";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { login, register } from "../features/auth/authSlice";

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
  const [openedTelegramStep, setOpenedTelegramStep] = useState(false);

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
      setOpenedTelegramStep(false);
    }
  };

  const loginValid = username.trim().length >= 3 && password.length >= 8;
  const registerBaseValid =
    username.trim().length >= 3 &&
    password.length >= 8 &&
    telegramUsername.trim().replace(/^@/, "").length >= 3;
  const submitDisabled = loading || (mode === "login" ? !loginValid : !registerBaseValid);
  const mustOpenTelegram = mode === "register" && Boolean(registerBotLink);
  const continueDisabled = mustOpenTelegram && !openedTelegramStep;

  return (
    <main className="layout auth-layout">
      <section className="card auth-card">
        <p className="eyebrow">Pulseboard Access</p>
        <h1>{mode === "login" ? "Sign In" : "Create Account"}</h1>
        <p>Use your account to coordinate surf sessions with your crew.</p>
        <form onSubmit={submit} className="auth-form">
          <label>
            Username *
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              required
              minLength={3}
            />
          </label>
          {username.trim().length > 0 && username.trim().length < 3 ? (
            <p className="tiny error-text">Minimum 3 characters.</p>
          ) : null}
          <label>
            Password *
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={8}
            />
          </label>
          {password.length > 0 && password.length < 8 ? (
            <p className="tiny error-text">Minimum 8 characters.</p>
          ) : null}
          {mode === "register" ? (
            <label>
              Telegram Username *
              <input
                value={telegramUsername}
                onChange={(event) => setTelegramUsername(event.target.value)}
                required
                placeholder="@your_username"
              />
            </label>
          ) : null}
          {mode === "register" && telegramUsername.trim().replace(/^@/, "").length > 0 && telegramUsername.trim().replace(/^@/, "").length < 3 ? (
            <p className="tiny error-text">Telegram username: minimum 3 characters.</p>
          ) : null}
          {error ? <p className="error">{error}</p> : null}
          {registerMessage ? <p className="status">{registerMessage}</p> : null}
          {registerBotLink ? (
            <div className="verify-box">
              <p className="tiny">
                Registration requires Telegram confirmation:
                1. Open bot link
                2. Press Start in Telegram
                3. Come back and continue to login
              </p>
              <button
                className="ghost"
                type="button"
                onClick={() => {
                  window.open(registerBotLink, "_blank", "noopener,noreferrer");
                  setOpenedTelegramStep(true);
                }}
              >
                Open Telegram confirmation link
              </button>
              <button
                className="ghost"
                type="button"
                disabled={continueDisabled}
                onClick={() => setMode("login")}
              >
                Continue to login
              </button>
            </div>
          ) : null}
          {!registerBotLink && registerMessage && mode === "register" ? (
            <p className="tiny">
              Open bot manually, press Start, then login.
            </p>
          ) : null}
          <button className="auth-submit-btn" type="submit" disabled={submitDisabled}>
            {loading ? "Please wait..." : mode === "login" ? "Sign in" : "Create account"}
          </button>
        </form>
        <button
          className="ghost auth-switch-btn"
          disabled={continueDisabled}
          onClick={() => setMode((current) => (current === "login" ? "register" : "login"))}
        >
          {mode === "login" ? "Need an account? Register" : "Already have account? Login"}
        </button>
      </section>
    </main>
  );
}
