import { FormEvent, useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { applySession, login, register } from "../features/auth/authSlice";
import { api } from "../shared/api";
import {
  browserSupportsPasskeys,
  prepareAuthenticationOptions,
  serializeAuthenticationCredential,
} from "../shared/passkey";

function normalizeTelegramHandleInput(value: string): string {
  const trimmed = value.replace(/\s+/g, "");
  const withoutAts = trimmed.replace(/^@+/, "");
  return `@${withoutAts}`;
}

export function AuthPanel() {
  const dispatch = useAppDispatch();
  const { loading, error, registerMessage, registerBotLink } = useAppSelector(
    (state) => state.auth
  );
  const params = new URLSearchParams(window.location.search);
  const inviteToken = params.get("invite") ?? undefined;
  const resetTokenFromUrl = params.get("reset");
  const [mode, setMode] = useState<"login" | "register" | "forgot" | "reset">(
    resetTokenFromUrl ? "reset" : "login"
  );
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [telegramUsername, setTelegramUsername] = useState("@");
  const [forgotUsername, setForgotUsername] = useState("");
  const [forgotTelegram, setForgotTelegram] = useState("@");
  const [forgotLocked, setForgotLocked] = useState(false);
  const [forgotCooldownSeconds, setForgotCooldownSeconds] = useState(0);
  const [resetToken] = useState(resetTokenFromUrl ?? "");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [localStatus, setLocalStatus] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [openedTelegramStep, setOpenedTelegramStep] = useState(false);
  const [passkeyLoading, setPasskeyLoading] = useState(false);

  useEffect(() => {
    if (forgotCooldownSeconds <= 0) {
      return;
    }
    const timer = window.setInterval(() => {
      setForgotCooldownSeconds((value) => Math.max(value - 1, 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [forgotCooldownSeconds]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLocalError(null);
    setLocalStatus(null);

    if (mode === "login") {
      await dispatch(login({ username, password }));
      return;
    }
    if (mode === "forgot") {
      if (forgotCooldownSeconds > 0) {
        return;
      }
      try {
        const response = await api.post<{ message: string }>("/auth/password/forgot", {
          username: forgotUsername,
          telegram_username: forgotTelegram
        });
        setLocalStatus(`${response.data.message} You can request another link in 15 seconds.`);
        setForgotLocked(true);
        setForgotCooldownSeconds(15);
      } catch (err: any) {
        setLocalError(err?.response?.data?.detail ?? "Failed to request password reset");
      }
      return;
    }
    if (mode === "reset") {
      try {
        const response = await api.post<{ message: string }>("/auth/password/reset", {
          token: resetToken,
          new_password: newPassword
        });
        setLocalStatus(response.data.message);
        setMode("login");
        window.history.replaceState({}, "", window.location.pathname);
      } catch (err: any) {
        setLocalError(err?.response?.data?.detail ?? "Failed to reset password");
      }
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

  const registerTelegramCore = telegramUsername.trim().replace(/^@/, "");
  const forgotTelegramCore = forgotTelegram.trim().replace(/^@/, "");
  const forgotFieldsDisabled = forgotLocked || loading;
  const loginValid = username.trim().length >= 3 && password.length >= 8;
  const registerBaseValid =
    username.trim().length >= 3 &&
    password.length >= 8 &&
    registerTelegramCore.length >= 3;
  const forgotValid = forgotUsername.trim().length >= 3 && forgotTelegramCore.length >= 3;
  const resetValid = resetToken.length >= 12 && newPassword.length >= 8 && newPassword === confirmNewPassword;
  const submitDisabled =
    loading ||
    (mode === "login"
      ? !loginValid
      : mode === "register"
        ? !registerBaseValid
        : mode === "forgot"
          ? !forgotValid || forgotCooldownSeconds > 0
          : !resetValid);
  const mustOpenTelegram = mode === "register" && Boolean(registerBotLink);
  const continueDisabled = mustOpenTelegram && !openedTelegramStep;

  const loginWithPasskey = async () => {
    setLocalError(null);
    setLocalStatus(null);
    if (!browserSupportsPasskeys()) {
      setLocalError("Passkeys are not supported in this browser.");
      return;
    }
    if (username.trim().length < 3) {
      setLocalError("Enter username first.");
      return;
    }
    setPasskeyLoading(true);
    try {
      const optionsRes = await api.post<{ options: any }>("/auth/passkeys/auth/options", {
        username: username.trim().toLowerCase(),
      });
      const publicKey = prepareAuthenticationOptions(optionsRes.data.options);
      const cred = (await navigator.credentials.get({
        publicKey,
      })) as PublicKeyCredential | null;
      if (!cred) {
        setLocalError("Passkey login was cancelled.");
        return;
      }
      const verifyRes = await api.post("/auth/passkeys/auth/verify", {
        username: username.trim().toLowerCase(),
        credential: serializeAuthenticationCredential(cred),
      });
      dispatch(applySession(verifyRes.data));
    } catch (err: any) {
      setLocalError(err?.response?.data?.detail ?? "Passkey login failed");
    } finally {
      setPasskeyLoading(false);
    }
  };

  return (
    <main className="layout auth-layout">
      <section className="card auth-card">
        <p className="eyebrow">Surfrew planner</p>
        <h1>
          {mode === "login"
            ? "Sign In"
            : mode === "register"
              ? "Create Account"
              : mode === "forgot"
                ? "Recover Password"
                : "Set New Password"}
        </h1>
        <p>Use your account to coordinate surf sessions with your crew.</p>
        <form onSubmit={submit} className="auth-form">
          {mode === "login" || mode === "register" ? (
            <>
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
            </>
          ) : null}
          {mode === "register" ? (
            <label>
              Telegram Username *
              <input
                value={telegramUsername}
                onChange={(event) => setTelegramUsername(normalizeTelegramHandleInput(event.target.value))}
                required
                placeholder="@your_username"
              />
            </label>
          ) : null}
          {mode === "register" && registerTelegramCore.length > 0 && registerTelegramCore.length < 3 ? (
            <p className="tiny error-text">Telegram username: minimum 3 characters.</p>
          ) : null}
          {mode === "forgot" ? (
            <>
              <label>
                Username *
                <input
                  value={forgotUsername}
                  onChange={(event) => setForgotUsername(event.target.value)}
                  disabled={forgotFieldsDisabled}
                  required
                  minLength={3}
                />
              </label>
              <label>
                Telegram Username *
                <input
                  value={forgotTelegram}
                  onChange={(event) => setForgotTelegram(normalizeTelegramHandleInput(event.target.value))}
                  disabled={forgotFieldsDisabled}
                  required
                  placeholder="@your_username"
                />
              </label>
              {forgotCooldownSeconds > 0 ? (
                <p className="tiny">Please wait {forgotCooldownSeconds}s before requesting a new reset link.</p>
              ) : null}
            </>
          ) : null}
          {mode === "reset" ? (
            <>
              <label>
                New Password *
                <input
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  required
                  minLength={8}
                />
              </label>
              <label>
                Confirm Password *
                <input
                  type="password"
                  value={confirmNewPassword}
                  onChange={(event) => setConfirmNewPassword(event.target.value)}
                  required
                  minLength={8}
                />
              </label>
              {confirmNewPassword.length > 0 && confirmNewPassword !== newPassword ? (
                <p className="tiny error-text">Passwords must match.</p>
              ) : null}
            </>
          ) : null}
          {error && (mode === "login" || mode === "register") ? <p className="error">{error}</p> : null}
          {localError ? <p className="error">{localError}</p> : null}
          {registerMessage ? <p className="status">{registerMessage}</p> : null}
          {localStatus ? <p className="status">{localStatus}</p> : null}
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
                onClick={() => {
                  setMode("login");
                  setForgotLocked(false);
                  setForgotCooldownSeconds(0);
                }}
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
          {mode === "login" ? (
            <>
              <div className="auth-login-actions">
                <button className="auth-submit-btn" type="submit" disabled={submitDisabled}>
                  {loading ? "Please wait..." : "Sign in"}
                </button>
                <button
                  className="ghost auth-submit-btn"
                  type="button"
                  onClick={() => {
                    setMode("forgot");
                    setLocalError(null);
                    setLocalStatus(null);
                    setForgotLocked(false);
                    setForgotCooldownSeconds(0);
                  }}
                >
                  Forgot password?
                </button>
              </div>
              <button
                className="ghost auth-submit-btn"
                type="button"
                disabled={passkeyLoading}
                onClick={() => void loginWithPasskey()}
              >
                {passkeyLoading ? "Checking passkey..." : "Face ID / Touch ID"}
              </button>
            </>
          ) : mode === "register" && registerBotLink ? null : (
            <button className="auth-submit-btn" type="submit" disabled={submitDisabled}>
              {loading
                ? "Please wait..."
                : mode === "register"
                  ? "Create account"
                  : mode === "forgot"
                    ? forgotCooldownSeconds > 0
                      ? `Retry in ${forgotCooldownSeconds}s`
                      : "Send reset link"
                    : "Save new password"}
            </button>
          )}
        </form>
        {mode === "login" ? (
          <button
            className="ghost auth-switch-btn"
            disabled={continueDisabled}
            onClick={() => setMode("register")}
          >
            Need an account? Register
          </button>
        ) : null}
        {mode === "register" ? (
          <button
            className="ghost auth-switch-btn"
            disabled={continueDisabled}
            onClick={() => setMode("login")}
          >
            Already have account? Login
          </button>
        ) : null}
        {(mode === "forgot" || mode === "reset") ? (
          <button
            className="ghost auth-switch-btn"
            onClick={() => {
              setMode("login");
              setLocalError(null);
              setForgotLocked(false);
              setForgotCooldownSeconds(0);
            }}
          >
            Back to login
          </button>
        ) : null}
      </section>
    </main>
  );
}
