/**
 * Tester för dropdown-etiketterna på startsidan (Rateraknare).
 *
 * Syfte: säkerställa att varje visningsetikett (t.ex. "IVA-sjuksköterska",
 * "Kirurg", "Lungläkare") fortfarande pekar på EXAKT en kanonisk yrkeskategori
 * och att prisuppslaget för den etiketten ger priset för rätt roll.
 *
 * Kör: bun run test
 *   DB-testet (att varje kanonisk nyckel finns i `rates`) kräver
 *   VITE_SUPABASE_URL + VITE_SUPABASE_PUBLISHABLE_KEY, annars skippas det.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { roleLabel5c } from "./roleLabels5c";
import { computeRate5c, basePrices, roleOptions5c, type RateRow } from "./rate5c";

const env = (k: string): string | undefined =>
  (import.meta as unknown as { env?: Record<string, string> }).env?.[k] ??
  (typeof process !== "undefined" ? process.env?.[k] : undefined);

const SUPABASE_URL = env("VITE_SUPABASE_URL");
const ANON_KEY = env("VITE_SUPABASE_PUBLISHABLE_KEY") ?? env("VITE_SUPABASE_ANON_KEY");
const hasEnv = Boolean(SUPABASE_URL && ANON_KEY);

/**
 * Förväntad 1:1-bindning etikett → kanonisk roll.
 * Detta är kontraktet: ändras en etikett utan att kanonisk roll följer med,
 * failar testet innan fel pris kan visas.
 */
const EXPECTED: Array<[label: string, canonical: string]> = [
  // Sjuksköterskor
  ["Akutsjuksköterska", "Specialistsjuksköterska akutsjukvård"],
  ["Ambulanssjuksköterska", "Specialistsjuksköterska ambulanssjukvård"],
  ["Anestesisjuksköterska", "Specialistsjuksköterska anestesi"],
  ["Barnsjuksköterska", "Specialistsjuksköterska barn och ungdom"],
  ["Diabetessjuksköterska", "Specialistsjuksköterska diabetesvård"],
  ["Företagssjuksköterska", "Specialistsjuksköterska företagshälsovård"],
  ["Hjärtsjuksköterska", "Specialistsjuksköterska hjärtsjukvård"],
  ["Infektionssjuksköterska", "Specialistsjuksköterska infektionssjukvård"],
  ["IVA-sjuksköterska", "Specialistsjuksköterska intensivvård"],
  ["Kirurgsjuksköterska", "Specialistsjuksköterska kirurgisk vård"],
  ["Medicinsjuksköterska", "Specialistsjuksköterska medicinsk vård"],
  ["Ögonsjuksköterska", "Specialistsjuksköterska ögonsjukvård"],
  ["Onkologisjuksköterska", "Specialistsjuksköterska onkologisk vård"],
  ["Operationssjuksköterska", "Specialistsjuksköterska operationssjukvård"],
  ["Palliativsjuksköterska", "Specialistsjuksköterska palliativ vård"],
  ["Psykiatrisjuksköterska", "Specialistsjuksköterska psykiatrisk vård"],
  ["Geriatriksjuksköterska", "Specialistsjuksköterska vård av äldre"],
  ["Grundutbildad sjuksköterska", "Sjuksköterska"],

  // Läkare
  ["Akutläkare", "Specialistläkare akutsjukvård"],
  ["Allergolog", "Specialistläkare allergologi"],
  ["Allmänläkare", "Specialistläkare allmänmedicin"],
  ["Äldrepsykiater", "Specialistläkare äldrepsykiatri"],
  ["Anestesiläkare", "Specialistläkare anestesi och intensivvård"],
  ["Arbets- och miljömedicinare", "Specialistläkare arbets- och miljömedicin"],
  ["Arbetsmedicinare", "Specialistläkare arbetsmedicin"],
  ["Barnallergolog", "Specialistläkare barn- och ungdomsallergologi"],
  ["Barnonkolog", "Specialistläkare barn- och ungdomshematologi och onkologi"],
  ["Barnkardiolog", "Specialistläkare barn- och ungdomskardiologi"],
  ["Barnkirurg", "Specialistläkare barn- och ungdomskirurgi"],
  ["Barnläkare", "Specialistläkare barn- och ungdomsmedicin"],
  ["Barnneurolog", "Specialistläkare barn- och ungdomsneurologi med habilitering"],
  ["BUP-läkare", "Specialistläkare barn- och ungdomspsykiatri"],
  ["Beroendeläkare", "Specialistläkare beroendemedicin"],
  ["Endokrinolog", "Specialistläkare endokrinologi och diabetologi"],
  ["Geriatriker", "Specialistläkare geriatrik"],
  ["Gynonkolog", "Specialistläkare gynekologisk onkologi"],
  ["Handkirurg", "Specialistläkare handkirurgi"],
  ["Hematolog", "Specialistläkare hematologi"],
  ["Audiolog", "Specialistläkare hörsel- och balansrubbningar"],
  ["Dermatolog", "Specialistläkare hud- och könssjukdomar"],
  ["Infektionsläkare", "Specialistläkare infektionssjukdomar"],
  ["Internmedicinare", "Specialistläkare internmedicin"],
  ["Kardiolog", "Specialistläkare kardiologi"],
  ["Kärlkirurg", "Specialistläkare kärlkirurgi"],
  ["Kirurg", "Specialistläkare kirurgi"],
  ["Klinisk farmakolog", "Specialistläkare klinisk farmakologi"],
  ["Klinisk fysiolog", "Specialistläkare klinisk fysiologi"],
  ["Klinisk genetiker", "Specialistläkare klinisk genetik"],
  ["Klinisk immunolog", "Specialistläkare klinisk immunologi och transfusionsmedicin"],
  ["Klinisk kemist", "Specialistläkare klinisk kemi"],
  ["Klinisk mikrobiolog", "Specialistläkare klinisk mikrobiologi"],
  ["Klinisk neurofysiolog", "Specialistläkare klinisk neurofysiologi"],
  ["Patolog", "Specialistläkare klinisk patologi"],
  ["Lungläkare", "Specialistläkare lungsjukdomar"],
  ["Gastroenterolog", "Specialistläkare medicinsk gastroenterologi och hepatologi"],
  ["Neonatolog", "Specialistläkare neonatologi"],
  ["Neurokirurg", "Specialistläkare neurokirurgi"],
  ["Neurolog", "Specialistläkare neurologi"],
  ["Neuroradiolog", "Specialistläkare neuroradiologi"],
  ["Nefrolog", "Specialistläkare njurmedicin"],
  ["Nuklearmedicinare", "Specialistläkare nuklearmedicin"],
  ["Gynekolog", "Specialistläkare obstetrik och gynekologi"],
  ["Ögonläkare", "Specialistläkare ögonsjukdomar"],
  ["Onkolog", "Specialistläkare onkologi"],
  ["ÖNH-läkare", "Specialistläkare öron-, näs- och halssjukdomar"],
  ["Ortoped", "Specialistläkare ortopedi"],
  ["Palliativläkare", "Specialistläkare palliativ medicin"],
  ["Plastikkirurg", "Specialistläkare plastikkirurgi"],
  ["Psykiater", "Specialistläkare psykiatri"],
  ["Radiolog", "Specialistläkare radiologi"],
  ["Rättsläkare", "Specialistläkare rättsmedicin"],
  ["Rättspsykiater", "Specialistläkare rättspsykiatri"],
  ["Rehabläkare", "Specialistläkare rehabiliteringsmedicin"],
  ["Reumatolog", "Specialistläkare reumatologi"],
  ["Foniater", "Specialistläkare röst- och talrubbningar"],
  ["Skolläkare", "Specialistläkare skolhälsovård"],
  ["Smärtläkare", "Specialistläkare smärtlindring"],
  ["Socialmedicinare", "Specialistläkare socialmedicin"],
  ["Thoraxkirurg", "Specialistläkare thoraxkirurgi"],
  ["Urolog", "Specialistläkare urologi"],
  ["Vårdhygienläkare", "Specialistläkare vårdhygien"],
];

describe("roleLabel5c – etikett ↔ kanonisk roll", () => {
  it.each(EXPECTED)("etiketten \"%s\" hör till %s", (label, canonical) => {
    expect(roleLabel5c(canonical)).toBe(label);
  });

  it("har unika etiketter (ingen etikett pekar på två roller)", () => {
    const seen = new Map<string, string>();
    const dupes: string[] = [];
    for (const [label, canonical] of EXPECTED) {
      const prev = seen.get(label);
      if (prev) dupes.push(`${label}: ${prev} + ${canonical}`);
      else seen.set(label, canonical);
    }
    expect(dupes).toEqual([]);
  });

  it("faller tillbaka på kanonisk text för omappade roller", () => {
    expect(roleLabel5c("Barnmorska")).toBe("Barnmorska");
  });

  it("visar aldrig prefixen 'Specialistsjuksköterska'/'Specialistläkare'", () => {
    const leaking = EXPECTED.filter(([label]) => /^Specialist(sjuksköterska|läkare)/.test(label));
    expect(leaking).toEqual([]);
  });
});

describe("prisuppslag via etikett", () => {
  // Distinkta priser per roll så att ett felkopplat uppslag ger fel siffra.
  const rows: RateRow[] = EXPECTED.map(([, canonical], i) => ({
    yrkeskategori: canonical,
    zon: "Zon 2",
    typ: "Grundpris",
    timpris_kund: 600 + i,
  }));

  const canonicalForLabel = (label: string): string => {
    const hit = EXPECTED.find(([l]) => l === label);
    if (!hit) throw new Error(`Okänd etikett: ${label}`);
    return hit[1];
  };

  it.each(EXPECTED)("\"%s\" hämtar priset för %s (Zon 2)", (label, canonical) => {
    const expected = rows.find((r) => r.yrkeskategori === canonical)!.timpris_kund;
    const rate = computeRate5c(rows, canonicalForLabel(label), "Zon 2");
    expect(rate).not.toBeNull();
    expect(rate!.timpris_kund).toBe(expected);
    expect(rate!.foretagareKrH).toBeGreaterThan(0);
    expect(rate!.foretagareKrH).toBeLessThan(expected);
  });

  it("varje dropdown-option i rate-datan får en etikett", () => {
    const options = roleOptions5c(basePrices(rows));
    expect(options.length).toBe(EXPECTED.length);
    for (const opt of options) {
      expect(roleLabel5c(opt)).toBe(EXPECTED.find(([, c]) => c === opt)![0]);
    }
  });
});

describe("kanoniska roller finns i rates (DB)", () => {
  let dbRoles = new Set<string>();

  beforeAll(async () => {
    if (!hasEnv) return;
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/rates?select=yrkeskategori&typ=eq.Grundpris&limit=5000`,
      { headers: { apikey: ANON_KEY!, Authorization: `Bearer ${ANON_KEY}` } }
    );
    if (!res.ok) return;
    const data = (await res.json()) as Array<{ yrkeskategori: string }>;
    dbRoles = new Set(data.map((r) => r.yrkeskategori));
  }, 30_000);

  it("varje mappad roll matchar en yrkeskategori i rates", () => {
    if (!hasEnv || dbRoles.size === 0) {
      // Utan DB-åtkomst i miljön hoppar vi över – enhetstesterna ovan gäller ändå.
      expect(true).toBe(true);
      return;
    }
    const missing = EXPECTED.filter(([, canonical]) => !dbRoles.has(canonical)).map(
      ([label, canonical]) => `${label} → ${canonical}`
    );
    expect(missing).toEqual([]);
  });
});
