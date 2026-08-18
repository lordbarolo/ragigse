/**
 * Lättviktig SEO-hygienkontroll av egen HTML.
 *
 * Medvetet regex-baserad: ingen DOM-parser, inga Node-only-paket — koden körs i
 * Worker-runtime (Cloudflare) via src/routes/api/public/seo-scan.ts.
 *
 * Kontrollerna speglar det vi faktiskt lovar i route-head() och JSON-LD:
 * titel, description, en enda h1, self-referencing canonical, og-taggar,
 * giltig JSON-LD samt att dateModified stämmer med contentFreshness-registret.
 */

export type Severity = "error" | "warning" | "info";

export interface Finding {
  path: string;
  checkId: string;
  severity: Severity;
  message: string;
}

const BASE_URL = "https://vardbemanning.ai";

const stripTags = (s: string) => s.replace(/<[^>]*>/g, "").trim();

function meta(html: string, attr: "name" | "property", key: string): string | null {
  const re = new RegExp(
    `<meta[^>]*${attr}=["']${key}["'][^>]*content=["']([^"']*)["']`,
    "i",
  );
  const alt = new RegExp(
    `<meta[^>]*content=["']([^"']*)["'][^>]*${attr}=["']${key}["']`,
    "i",
  );
  return html.match(re)?.[1] ?? html.match(alt)?.[1] ?? null;
}

function canonical(html: string): string | null {
  const re = /<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']*)["']/i;
  const alt = /<link[^>]*href=["']([^"']*)["'][^>]*rel=["']canonical["']/i;
  return html.match(re)?.[1] ?? html.match(alt)?.[1] ?? null;
}

function jsonLdBlocks(html: string): string[] {
  const out: string[] = [];
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) out.push(m[1]!);
  return out;
}

function collectDateModified(node: unknown, out: Set<string>) {
  if (Array.isArray(node)) {
    for (const n of node) collectDateModified(n, out);
    return;
  }
  if (node && typeof node === "object") {
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      if (k === "dateModified" && typeof v === "string") out.add(v.slice(0, 10));
      else collectDateModified(v, out);
    }
  }
}

export interface CheckPageInput {
  path: string;
  html: string;
  status: number;
  /** Förväntat innehållsdatum ur contentFreshness-registret (om sidan har ett). */
  expectedDateModified?: string;
}

export function checkPage({
  path,
  html,
  status,
  expectedDateModified,
}: CheckPageInput): Finding[] {
  const f: Finding[] = [];
  const add = (checkId: string, severity: Severity, message: string) =>
    f.push({ path, checkId, severity, message });

  if (status !== 200) {
    add("http_status", "error", `HTTP ${status} — sidan svarar inte med 200.`);
    return f;
  }

  // Titel
  const rawTitle = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  const title = rawTitle ? stripTags(rawTitle) : "";
  if (!title) add("title_missing", "error", "Ingen <title> hittades.");
  else if (title.length > 60)
    add("title_length", "warning", `Titeln är ${title.length} tecken (rekommenderat ≤ 60).`);

  // Description
  const desc = meta(html, "name", "description");
  if (!desc) add("description_missing", "error", "Ingen meta description hittades.");
  else if (desc.length > 160)
    add("description_length", "warning", `Description är ${desc.length} tecken (rekommenderat ≤ 160).`);

  // Exakt en h1
  const h1Count = (html.match(/<h1[\s>]/gi) ?? []).length;
  if (h1Count === 0) add("h1_missing", "error", "Sidan saknar <h1>.");
  else if (h1Count > 1) add("h1_multiple", "warning", `Sidan har ${h1Count} <h1>-element.`);

  // Canonical — ska peka på sidan själv
  const can = canonical(html);
  if (!can) {
    add("canonical_missing", "warning", "Ingen <link rel=\"canonical\"> hittades.");
  } else {
    const expected = [`${BASE_URL}${path}`, path];
    const normalized = can.replace(/\/$/, "") || "/";
    const ok = expected.some((e) => (e.replace(/\/$/, "") || "/") === normalized);
    if (!ok)
      add(
        "canonical_mismatch",
        "error",
        `Canonical pekar på ${can} i stället för ${BASE_URL}${path}.`,
      );
  }

  // Open Graph
  if (!meta(html, "property", "og:title")) add("og_title_missing", "warning", "og:title saknas.");
  if (!meta(html, "property", "og:description"))
    add("og_description_missing", "warning", "og:description saknas.");

  // JSON-LD
  const blocks = jsonLdBlocks(html);
  if (blocks.length === 0) {
    add("jsonld_missing", "info", "Ingen JSON-LD hittades på sidan.");
  } else {
    const dates = new Set<string>();
    for (const [i, raw] of blocks.entries()) {
      try {
        collectDateModified(JSON.parse(raw), dates);
      } catch {
        add("jsonld_invalid", "error", `JSON-LD-block ${i + 1} går inte att tolka som JSON.`);
      }
    }
    if (expectedDateModified) {
      if (dates.size === 0) {
        add("datemodified_missing", "warning", "JSON-LD saknar dateModified.");
      } else if (!dates.has(expectedDateModified)) {
        add(
          "datemodified_mismatch",
          "error",
          `dateModified är ${[...dates].join(", ")} men registret anger ${expectedDateModified}.`,
        );
      }
    }
  }

  return f;
}
