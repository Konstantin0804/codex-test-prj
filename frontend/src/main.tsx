import React from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import { store } from "./app/store";
import { DashboardPage } from "./pages/DashboardPage";
import "./shared/styles.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <Provider store={store}>
      <DashboardPage />
    </Provider>
  </React.StrictMode>
);
