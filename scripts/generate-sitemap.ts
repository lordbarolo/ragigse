// Runs before `vite dev` and `vite build` (predev/prebuild hooks); writes public/sitemap.xml.
// Sync rules: Keep in sync with src/App.tsx (reports) and src/pages/Campaign.tsx (campaigns).

import { writeFileSync } from "fs"
import { resolve } from "path"

const BASE_URL = "https://www.compcare.se"

interface SitemapEntry {
  path: string
  lastmod?: string
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never"
  priority?: string
}

// Slugs from src/pages/Campaign.tsx ROLE_MAP
const CAMPAIGN_ROLES = [
  "anestesi", "intensivvard", "operation", "akutsjukvard", "ambulans", 
  "barnmorska", "sjukskoterska", "distriktsskoterska", "rontgen", 
  "psykiatri", "onkologi", "kirurgi", "medicin", "palliativ", "barn", 
  "hjart", "aldre", "diabetes", "infektion", "ogon", "foretagshalsa", 
  "skola", "lakare", "specialist-a", "specialist-b"
];

// Static report routes from src/App.tsx
const REPORT_SLUGS = [
  "anestesisjukskoterska",
  "lakare-allmanmedicin",
  "sjukskoterska",
  "legitimerad-sjukskoterska",
  "leg-sjukskoterska",
  "allmansjukskoterska",
  "leg-ssk",
  "ssk",
  // Specialistläkar-rapporter (src/data/doctorSpecialtyReports.ts)
  "lakare-anestesi",
  "lakare-barn-och-ungdomsmedicin",
  "lakare-bup",
  "lakare-dermatolog",
  "lakare-kardiolog",
  "lakare-internmedicin",
  "lakare-hematologi",
  "lakare-njurmedicin",
  "lakare-neurologi",
  "lakare-onh",
  "lakare-psykiatri",
  "lakare-radiologi",
  "lakare-ogon",
];

const entries: SitemapEntry[] = [
  // Core pages
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/vanliga-fragor", changefreq: "monthly", priority: "0.5" },
  { path: "/faktasidor", changefreq: "monthly", priority: "0.8" },
  { path: "/integritetspolicy", changefreq: "yearly", priority: "0.3" },
  
  // Static reports
  ...REPORT_SLUGS.map(slug => ({
    path: `/rapport/${slug}`,
    changefreq: "monthly" as const,
    priority: "0.8"
  })),
  
  // Specific landing (legacy/partner)
  { path: "/bollnas/lakare-alm", changefreq: "monthly", priority: "0.6" },

  // Campaigns
  ...CAMPAIGN_ROLES.map(role => ({
    path: `/kampanj/${role}`,
    changefreq: "monthly" as const,
    priority: "0.7"
  })),

  // AI & Discovery
  { path: "/llms.txt", changefreq: "monthly", priority: "0.4" },
  { path: "/openapi.json", changefreq: "monthly", priority: "0.4" },
]

function generateSitemap(entries: SitemapEntry[]) {
  const urls = entries.map((e) =>
    [
      `  <url>`,
      `    <loc>${BASE_URL}${e.path}</loc>`,
      e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
      e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
      e.priority ? `    <priority>${e.priority}</priority>` : null,
      `  </url>`,
    ]
      .filter(Boolean)
      .join("\n"),
  )

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...urls,
    `</urlset>`,
  ].join("\n")
}

try {
  const sitemap = generateSitemap(entries);
  writeFileSync(resolve("public/sitemap.xml"), sitemap);
  console.log(`sitemap.xml written (${entries.length} entries)`);
} catch (error) {
  console.error("Failed to generate sitemap:", error);
  process.exit(1);
}
