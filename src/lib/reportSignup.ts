import { DOCTOR_SPECIALTIES, NURSE_VALUE_MAP } from "@/lib/specialityLists";
import { SPECIALITY_BY_SLUG } from "@/lib/specialitySlugs";
import { sanitizeRedirect } from "@/lib/authIntent";

/** Public report aliases resolve to the existing survey's exact role values. */
export function reportRolePrefill(value: string | null) {
  if (!value) return null;
  const alias = value === "sjukskoterska" ? "Sjuksköterska"
    : value === "anestesi" ? "Specialistsjuksköterska anestesi"
    : SPECIALITY_BY_SLUG[value]?.resolvedRole ?? value;
  if (alias === "Sjuksköterska") return { category: "ssk" as const, roleValue: "__allman", yrke: alias };
  if (alias === "Röntgensjuksköterska") return { category: "ssk" as const, roleValue: "__rontgen", yrke: alias };
  if (alias === "Barnmorska") return { category: "barnmorska" as const, roleValue: "__barnmorska", yrke: alias };
  if (alias === "Legitimerad läkare" || alias === "ST-läkare") {
    return { category: "lakare" as const, roleValue: alias === "ST-läkare" ? "__st" : "__leg", yrke: alias };
  }
  const specialty = DOCTOR_SPECIALTIES.find((name) => `Specialistläkare ${name.toLowerCase()}`.toLowerCase() === alias.toLowerCase());
  if (specialty) return { category: "lakare" as const, roleValue: specialty, yrke: `Specialistläkare ${specialty.toLowerCase()}` };
  const nurse = Object.entries(NURSE_VALUE_MAP).find(([label, role]) => role === alias || label === alias);
  if (nurse) return { category: "ssk" as const, roleValue: nurse[0], yrke: nurse[1] };
  return null;
}

export function reportSignupHref(role?: string, kommun?: string) {
  const params = new URLSearchParams({ redirect: "/consultant/loneanalys" });
  if (role) params.set("yrke", reportRolePrefill(role)?.yrke ?? role);
  if (kommun) params.set("kommun", kommun);
  return `/registrera?${params.toString()}`;
}

/** Keep public report context through both email and Google authentication. */
export function onboardingHref(search: string) {
  const source = new URLSearchParams(search);
  const params = new URLSearchParams();
  const redirect = sanitizeRedirect(source.get("redirect"));
  if (redirect) params.set("redirect", redirect);
  for (const key of ["yrke", "kommun"]) {
    const value = source.get(key);
    if (value) params.set(key, value);
  }
  return params.size ? `/onboarding?${params.toString()}` : "/onboarding";
}