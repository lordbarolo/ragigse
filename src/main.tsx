import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./lib/posthog";
import { captureParams } from "./lib/captureParams";

captureParams();

createRoot(document.getElementById("root")!).render(<App />);
