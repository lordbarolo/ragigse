import { describe, expect, it } from "vitest";
import { isProfileComplete } from "./profileContext";

describe("isProfileComplete", () => {
  it("godkänner en profil med exakt specialistroll och kommun", () => {
    expect(isProfileComplete({
      role: "Anestesisjuksköterska",
      kommun: "Göteborg",
      employmentType: "foretagare",
      hourlyRate: 1100,
    })).toBe(true);
  });

  it("underkänner en profil där roll eller kommun saknas", () => {
    expect(isProfileComplete({
      role: null,
      kommun: "Göteborg",
      employmentType: "foretagare",
      hourlyRate: 1100,
    })).toBe(false);
  });
});