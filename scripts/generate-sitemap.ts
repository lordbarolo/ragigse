// Runs before `vite dev` and `vite build` (predev/prebuild hooks); writes public/sitemap.xml.
// Läkarspecialiteterna läses direkt ur src/data/doctorSpecialtyReports.ts — lägg till en
// ny specialitet där och den hamnar automatiskt i sitemapen.
// Medvetet UTANFÖR sitemapen (noindex i sidorna): /lon/[roll]/[ort], /kampanj/[roll],
// /bollnas/lakare-alm, alias-slugar för sjuksköterskerapporten, /llms.txt, /openapi.json
// (de senare annonseras i robots.txt).

import { writeFileSync } from "fs"
import { resolve } from "path"
import { DOCTOR_SPECIALTY_REPORTS } from "../src/data/doctorSpecialtyReports"
import { GUIDES } from "../src/data/guides"
import { getGuideUpdatedAt, getReportUpdatedAt } from "../src/data/contentFreshness"

const BASE_URL = "https://vardbemanning.ai"

interface SitemapEntry {
  path: string
  lastmod?: string
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never"
  priority?: string
}

// Kanoniska rapportsidor (alias-slugar 301:ar till /rapport/sjukskoterska).
// Handskrivna rutter under src/routes/rapport/ + alla läkarspecialiteter.
const REPORT_SLUGS = [
  "anestesisjukskoterska",
  "lakare-allmanmedicin",
  "sjukskoterska",
  ...DOCTOR_SPECIALTY_REPORTS.map((r) => r.slug),
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
    lastmod: getReportUpdatedAt(slug),
    changefreq: "monthly" as const,
    priority: "0.8"
  })),

  // Guider (långformat innehåll)
  ...GUIDES.map(g => ({
    path: `/guide/${g.slug}`,
    lastmod: getGuideUpdatedAt(g.slug),
    changefreq: "monthly" as const,
    priority: "0.9"
  })),
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
