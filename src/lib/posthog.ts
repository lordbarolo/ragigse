import posthog from "posthog-js";
import { setConsent } from "./cookieConsent";

const POSTHOG_KEY = "phc_GiBn5CBOm72IrzgsdQRuUcK2mujk5Q0ZeI6hs8ixvwv";
const CONSENT_KEY = "compcare_cookie_consent";

const isInternalHost = (): boolean => {
  const host = window.location.hostname;
  return (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host.includes("lovable.app") ||
    host.includes("lovableproject.com")
  );
};

export const initPostHog = () => {
  if (isInternalHost()) return;

  const consent = localStorage.getItem(CONSENT_KEY);

  posthog.init(POSTHOG_KEY, {
    api_host: "https://eu.i.posthog.com",
    ui_host: "https://eu.posthog.com",
    capture_pageview: true,
    persistence: consent === "accepted" ? "localStorage+cookie" : "memory",
    opt_out_capturing_by_default: consent !== "accepted",
    cross_subdomain_cookie: true,
  });
};

export const acceptTracking = () => {
  setConsent("accepted");
  posthog.opt_in_capturing();
  posthog.set_config({ persistence: "localStorage+cookie" });
};

export const declineTracking = () => {
  setConsent("rejected");
  posthog.opt_out_capturing();
};

export default posthog;
