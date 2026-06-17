import "./lib/posthog";
import { captureError } from "./lib/posthog";
import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";
import { captureParams } from "./lib/captureParams";
import { initAuthIdentitySync } from "./lib/identify";

captureParams();
initAuthIdentitySync();

// Global felhantering — fångar krascher som inte når någon try/catch
// eller React Error Boundary, och rapporterar dem till PostHog.
window.addEventListener("error", (event) => {
  captureError(event.error ?? event.message, {
    source: "window.onerror",
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
  });
});

window.addEventListener("unhandledrejection", (event) => {
  captureError(event.reason, { source: "unhandledrejection" });
});

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <App />
  </HelmetProvider>
);
