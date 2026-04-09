import { initPostHog } from "./lib/posthog";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { captureParams } from "./lib/captureParams";

initPostHog();
captureParams();

createRoot(document.getElementById("root")!).render(<App />);
