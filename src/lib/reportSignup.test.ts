import { describe, expect, it } from "vitest";
import { onboardingHref, reportRolePrefill, reportSignupHref } from "./reportSignup";
import { DOCTOR_SPECIALTY_REPORTS } from "@/data/doctorSpecialtyReports";

describe("report signup preserves the report role", () => {
  it("preserves the general nurse instead of selecting a doctor", () => {
    expect(reportRolePrefill("sjukskoterska")).toEqual({ category: "ssk", roleValue: "__allman", yrke: "Sjuksköterska" });
  });
  it("keeps nurse anesthesia distinct from doctor anesthesia", () => {
    expect(reportRolePrefill("anestesi")?.yrke).toBe("Specialistsjuksköterska anestesi");
    expect(reportRolePrefill("anestesi-och-intensivvard")?.yrke).toBe("Specialistläkare anestesi och intensivvård");
  });
  it("preserves all doctor report specialties", () => {
    for (const cfg of DOCTOR_SPECIALTY_REPORTS) {
      expect(reportRolePrefill(cfg.prefillSlug)?.yrke).toBe(cfg.skrCategory);
    }
  });
  it("preserves role and municipality through signup and onboarding", () => {
    const signup = new URL(reportSignupHref("allmanmedicin", "Bollnäs"), "https://vardbemanning.ai");
    const onboarding = new URL(onboardingHref(signup.search), signup.origin);
    expect(onboarding.searchParams.get("yrke")).toBe("Specialistläkare allmänmedicin");
    expect(onboarding.searchParams.get("kommun")).toBe("Bollnäs");
    expect(onboarding.searchParams.get("redirect")).toBe("/consultant/loneanalys");
  });
  it("does not guess unknown roles or accept external return destinations", () => {
    expect(reportRolePrefill("unknown")).toBeNull();
    expect(onboardingHref("?redirect=https://example.com")).toBe("/onboarding");
  });
});