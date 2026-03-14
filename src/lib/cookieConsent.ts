const CONSENT_KEY = "compcare_cookie_consent";

export type ConsentStatus = "accepted" | "rejected" | null;

export function getConsent(): ConsentStatus {
  try {
    const val = localStorage.getItem(CONSENT_KEY);
    if (val === "accepted" || val === "rejected") return val;
    return null;
  } catch {
    return null;
  }
}

export function setConsent(status: "accepted" | "rejected") {
  try {
    localStorage.setItem(CONSENT_KEY, status);
  } catch {
    // Silent fail
  }
}
