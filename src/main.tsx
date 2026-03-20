import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initPostHog } from "./lib/posthog";
import { captureParams } from "./lib/captureParams";
import { getConsent } from "./lib/cookieConsent";

captureParams();

// Only init PostHog if user has previously accepted cookies
if (getConsent() === "accepted") {
  initPostHog();
}

createRoot(document.getElementById("root")!).render(<App />);
