import posthog from "posthog-js";

const isInternal =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1" ||
    window.location.hostname.endsWith(".lovableproject.com") ||
    window.location.hostname.includes("id-preview--"));

posthog.init("phc_GiBn5CBOm72IrzgsdQRuUcK2mujk5Q0ZeI6hs8ixvwv", {
  api_host: "https://eu.i.posthog.com",
  capture_pageview: true,
  autocapture: !isInternal,
  opt_out_capturing_by_default: isInternal,
});

export default posthog;
