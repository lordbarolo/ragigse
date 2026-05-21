import "./lib/posthog";
import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";
import { captureParams } from "./lib/captureParams";
import { initAuthIdentitySync } from "./lib/identify";

captureParams();
initAuthIdentitySync();

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <App />
  </HelmetProvider>
);
