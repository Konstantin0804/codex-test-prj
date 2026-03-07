import React from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import { store } from "./app/store";
import { applySession, logout, restoreSession } from "./features/auth/authSlice";
import { DashboardPage } from "./pages/DashboardPage";
import "leaflet/dist/leaflet.css";
import "./shared/styles.css";

void store.dispatch(restoreSession());

window.addEventListener("pulseboard:auth-required", () => {
  store.dispatch(logout());
});

window.addEventListener("pulseboard:auth-refreshed", (event) => {
  const custom = event as CustomEvent<{ access_token: string; username: string }>;
  if (!custom.detail) {
    return;
  }
  store.dispatch(
    applySession({
      access_token: custom.detail.access_token,
      token_type: "bearer",
      username: custom.detail.username
    })
  );
});

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <Provider store={store}>
      <DashboardPage />
    </Provider>
  </React.StrictMode>
);
