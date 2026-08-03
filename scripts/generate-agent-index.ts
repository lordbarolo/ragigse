// Runs before `vite dev` and `vite build`; writes public/agent-index.json.
// Machine-readable index of every valid specialty_slug and city_slug so that
// AI agents can enumerate endpoints without guessing.

import { writeFileSync } from "fs"
import { resolve } from "path"
import { ROLE_NAMES, CITY_NAMES, slugify, publishableRoles } from "./seo-roles"

const BASE_URL = "https://vardbemanning.ai"

// Synonym slugs accepted by public.lookup_rate via public.rate_slug_aliases.
// Snapshot — keep in sync if new aliases are added in the database.
const ALIAS_SLUGS = [
  "akutlakare","akutsjukskoterska","aldrepsykiater","aldresjukskoterska","allergolog",
  "allmanlakare","allmansjukskoterska","ambulanssjukskoterska","anestesilakare","anestesiolog",
  "anestesisjukskoterska","barnkardiolog","barnkirurg","barnlakare","barnneurolog",
  "barnpsykiater","barnsjukskoterska","beroendelakare","bup-lakare","dermatolog",
  "diabetessjukskoterska","distriktslakare","distriktsskoterska","dsk","endokrinolog",
  "foretagshalsosjukskoterska","foretagsskoterska","gastroenterolog","geriatriker",
  "geriatriksjukskoterska","grundutbildad-sjukskoterska","gynekolog","handkirurg","hematolog",
  "hjartlakare","hjartsjukskoterska","hudlakare","huslakare","infektionslakare",
  "infektionssjukskoterska","intensivvardssjukskoterska","internmedicinare","iva-sjukskoterska",
  "kardiolog","karlkirurg","kirurg","kirurgsjukskoterska","leg-sjukskoterska","leg-ssk",
  "legitimerad-sjukskoterska","lunglakare","medicinsjukskoterska","narkoslakare",
  "narkossjukskoterska","nefrolog","neonatolog","neurokirurg","neurolog","neuroradiolog",
  "njurlakare","oftalmolog","ogonlakare","ogonsjukskoterska","onh-lakare","onkolog",
  "onkologisjukskoterska","operationssjukskoterska","oronlakare","ortoped","palliativlakare",
  "palliativsjukskoterska","patolog","pediatriker","plastikkirurg","psykiater","psykiatriker",
  "psykiatrisjukskoterska","pulmonolog","radiolog","rattslakare","rattspsykiater","rehablakare",
  "reumatolog","rontgenlakare","rontgensjukskoterska","skolsjukskoterska","smartlakare",
  "socialmedicinare","ssk","thoraxkirurg","urolog",
]

const roles = publishableRoles(ROLE_NAMES)
  .map((name) => ({ name, slug: slugify(name) }))
  .sort((a, b) => a.slug.localeCompare(b.slug, "sv"))

const cities = CITY_NAMES
  .map((name) => ({ name, slug: slugify(name) }))
  .sort((a, b) => a.slug.localeCompare(b.slug, "sv"))

const index = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  name: "CompCare rate endpoint index",
  description:
    "Machine-readable index of all valid specialty_slug and city_slug values. Combine any specialty_slug with any city_slug to form a valid rate page URL. Roles are always addressed as their specific role — administrative group labels are never published.",
  version: "2026.1",
  generated_at: new Date().toISOString().slice(0, 10),
  base_url: BASE_URL,
  data_source:
    "SKR ramavtalspriser 2026 per roll och zon, minus bemanningsföretagets standardmarginal.",
  url_patterns: {
    rate_page: `${BASE_URL}/lon/{specialty_slug}/{city_slug}`,
    sitemap: `${BASE_URL}/sitemap.xml`,
    llms_txt: `${BASE_URL}/llms.txt`,
    openapi: `${BASE_URL}/openapi.json`,
  },
  counts: {
    specialties: roles.length,
    cities: cities.length,
    alias_slugs: ALIAS_SLUGS.length,
    rate_pages: roles.length * cities.length,
  },
  specialties: roles,
  cities,
  alias_slugs: ALIAS_SLUGS,
  notes: [
    "alias_slugs are accepted synonyms that resolve to a specific specialty; they are not separate roles.",
    "Group-level slugs (e.g. specialistsjukskoterska, specialistlakare-grupp-a) are intentionally invalid.",
    "Each rate page embeds JSON-LD (schema.org/Occupation, Dataset, FAQPage) server-rendered in the first HTML response.",
  ],
}

const outPath = resolve(process.cwd(), "public/agent-index.json")
writeFileSync(outPath, JSON.stringify(index, null, 2) + "\n", "utf8")
console.log(
  `agent-index.json: ${roles.length} specialties x ${cities.length} cities = ${roles.length * cities.length} rate pages`,
)
