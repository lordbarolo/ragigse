// Fallback-lista över publicerbara yrkesroller (aktiv avtalsversion i contract_version_rates).
// Används av scripts/generate-sitemap.ts när live-hämtningen inte är tillgänglig vid build.
// REGEL: aldrig gruppetiketter ("Grupp A/B", "Specialistsjuksköterska" utan specialitet, OB-tillägg).

export const ROLE_NAMES: string[] = [
  "Barnmorska",
  "Distriktssjuksköterska",
  "Legitimerad läkare",
  "Röntgensjuksköterska",
  "Sjuksköterska",
  "Skolsköterska",
  "ST-läkare",
  "Specialistläkare Akutsjukvård",
  "Specialistläkare Äldrepsykiatri",
  "Specialistläkare Allergologi",
  "Specialistläkare Allmänmedicin",
  "Specialistläkare Anestesi och intensivvård",
  "Specialistläkare Arbets- och miljömedicin",
  "Specialistläkare Arbetsmedicin",
  "Specialistläkare Barn- och ungdomsallergologi",
  "Specialistläkare Barn- och ungdomshematologi och onkologi",
  "Specialistläkare Barn- och ungdomskardiologi",
  "Specialistläkare Barn- och ungdomskirurgi",
  "Specialistläkare Barn- och ungdomsmedicin",
  "Specialistläkare Barn- och ungdomsneurologi med habilitering",
  "Specialistläkare Barn- och ungdomspsykiatri",
  "Specialistläkare Beroendemedicin",
  "Specialistläkare Endokrinologi och diabetologi",
  "Specialistläkare Geriatrik",
  "Specialistläkare Gynekologisk onkologi",
  "Specialistläkare Handkirurgi",
  "Specialistläkare Hematologi",
  "Specialistläkare Hörsel- och balansrubbningar",
  "Specialistläkare Hud- och könssjukdomar",
  "Specialistläkare Immunologi",
  "Specialistläkare Infektionssjukdomar",
  "Specialistläkare Internmedicin",
  "Specialistläkare Kardiologi",
  "Specialistläkare Kärlkirurgi",
  "Specialistläkare Kirurgi",
  "Specialistläkare Klinisk farmakologi",
  "Specialistläkare Klinisk fysiologi",
  "Specialistläkare Klinisk genetik",
  "Specialistläkare Klinisk immunologi och transfusionsmedicin",
  "Specialistläkare Klinisk kemi",
  "Specialistläkare Klinisk mikrobiologi",
  "Specialistläkare Klinisk neurofysiologi",
  "Specialistläkare Klinisk patologi",
  "Specialistläkare Lungsjukdomar",
  "Specialistläkare Medicinsk gastroenterologi och hepatologi",
  "Specialistläkare Neonatologi",
  "Specialistläkare Neurokirurgi",
  "Specialistläkare Neurologi",
  "Specialistläkare Neuroradiologi",
  "Specialistläkare Njurmedicin",
  "Specialistläkare Nuklearmedicin",
  "Specialistläkare Obstetrik och gynekologi",
  "Specialistläkare Ögonsjukdomar",
  "Specialistläkare Onkologi",
  "Specialistläkare Öron-, näs- och halssjukdomar",
  "Specialistläkare Ortopedi",
  "Specialistläkare Palliativ medicin",
  "Specialistläkare Plastikkirurgi",
  "Specialistläkare Psykiatri",
  "Specialistläkare Radiologi",
  "Specialistläkare Rättsmedicin",
  "Specialistläkare Rättspsykiatri",
  "Specialistläkare Rehabiliteringsmedicin",
  "Specialistläkare Reumatologi",
  "Specialistläkare Röst- och talrubbningar",
  "Specialistläkare Skolhälsovård",
  "Specialistläkare Smärtlindring",
  "Specialistläkare Socialmedicin",
  "Specialistläkare Thoraxkirurgi",
  "Specialistläkare Urologi",
  "Specialistläkare Vårdhygien",
  "Specialistsjuksköterska akutsjukvård",
  "Specialistsjuksköterska ambulanssjukvård",
  "Specialistsjuksköterska anestesi",
  "Specialistsjuksköterska barn och ungdom",
  "Specialistsjuksköterska diabetesvård",
  "Specialistsjuksköterska företagshälsovård",
  "Specialistsjuksköterska hjärtsjukvård",
  "Specialistsjuksköterska infektionssjukvård",
  "Specialistsjuksköterska intensivvård",
  "Specialistsjuksköterska kirurgisk vård",
  "Specialistsjuksköterska medicinsk vård",
  "Specialistsjuksköterska ögonsjukvård",
  "Specialistsjuksköterska onkologisk vård",
  "Specialistsjuksköterska operationssjukvård",
  "Specialistsjuksköterska palliativ vård",
  "Specialistsjuksköterska psykiatrisk vård",
  "Specialistsjuksköterska vård av äldre",
];

// De största/mest sökta kommunerna. Alla verifierade mot public.locations.
export const CITY_NAMES: string[] = [
  "Stockholm",
  "Göteborg",
  "Malmö",
  "Uppsala",
  "Linköping",
  "Västerås",
  "Örebro",
  "Helsingborg",
  "Norrköping",
  "Jönköping",
  "Umeå",
  "Lund",
  "Borås",
  "Eskilstuna",
  "Halmstad",
  "Växjö",
  "Karlstad",
  "Sundsvall",
  "Gävle",
  "Södertälje",
  "Luleå",
  "Östersund",
  "Falun",
  "Kalmar",
  "Skellefteå",
  "Trollhättan",
  "Kristianstad",
  "Nyköping",
  "Gotland",
];

/** Måste ge exakt samma resultat som public.cc_slugify i databasen. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[åäàáâ]/g, "a")
    .replace(/[öóô]/g, "o")
    .replace(/[éèêë]/g, "e")
    .replace(/[üúù]/g, "u")
    .replace(/[íì]/g, "i")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const GROUP_LABEL = /\bgrupp\s*[a-zA-Z0-9]+\b/i;

/** Filtrerar bort gruppetiketter och OB-tillägg (får aldrig publiceras som roll). */
export function publishableRoles(names: string[]): string[] {
  return names.filter((n) => n && !GROUP_LABEL.test(n) && !/^OB-tillägg/i.test(n));
}
