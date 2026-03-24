import "./lib/posthog";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { captureParams } from "./lib/captureParams";

captureParams();

createRoot(document.getElementById("root")!).render(<App />);
