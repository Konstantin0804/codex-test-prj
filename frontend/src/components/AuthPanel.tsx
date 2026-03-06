import { FormEvent, useState } from "react";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { login, register } from "../features/auth/authSlice";

export function AuthPanel() {
  const dispatch = useAppDispatch();
  const { loading, error, registerMessage, registerBotLink } = useAppSelector(
    (state) => state.auth
  );
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [telegramUsername, setTelegramUsername] = useState("@");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (mode === "login") {
      await dispatch(login({ username, password }));
      return;
    }
    await dispatch(register({ username, password, telegram_username: telegramUsername }));
    setMode("login");
  };

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
          <button type="submit" disabled={loading}>
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
