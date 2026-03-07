/** Capture UTM and coupon params from the URL on first page load and persist in sessionStorage. */

const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;
const SS_UTM_KEY = "utmParams";
const SS_COUPON_KEY = "couponCode";

export function captureParams() {
  const params = new URLSearchParams(window.location.search);

  // UTM — only overwrite if at least one UTM param is present
  if (UTM_KEYS.some((k) => params.has(k))) {
    const utm: Record<string, string | null> = {};
    for (const k of UTM_KEYS) {
      utm[k.replace("utm_", "")] = params.get(k) || null;
    }
    sessionStorage.setItem(SS_UTM_KEY, JSON.stringify(utm));
  }

  // Coupon — persist if present
  const coupon = params.get("coupon");
  if (coupon) {
    sessionStorage.setItem(SS_COUPON_KEY, coupon);
  }
}

export function getUtmParams(): Record<string, string | null> | null {
  const raw = sessionStorage.getItem(SS_UTM_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function getCouponCode(): string | null {
  return sessionStorage.getItem(SS_COUPON_KEY) || null;
}
