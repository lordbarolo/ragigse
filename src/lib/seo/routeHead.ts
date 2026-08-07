/**
 * Enda källan för head-metadata (title/description/canonical/og/twitter).
 *
 * Används från route-filernas `head()` i src/routes/*. Sidkomponenter ska
 * ALDRIG sätta title/description/canonical själva — då hamnar två
 * uppsättningar i den renderade HTML:en och Google väljer godtyckligt.
 *
 * JSON-LD ligger kvar i sidkomponenterna via <JsonLd /> eftersom schemat
 * ofta byggs av data som bara finns vid render.
 */

const BASE_URL = "https://vardbemanning.ai";
const DEFAULT_OG_IMAGE = `${BASE_URL}/vardbemanning-og.png`;

export interface SeoHeadInput {
  title: string;
  description: string;
  /** Sökväg med inledande slash, t.ex. "/faktasidor". */
  path: string;
  ogType?: "website" | "article" | "product";
  /** Absolut URL eller sökväg. Faller tillbaka på sitewide og-bilden. */
  image?: string;
  noindex?: boolean;
}

function absolute(image: string): string {
  if (image.startsWith("http://") || image.startsWith("https://")) return image;
  return `${BASE_URL}${image.startsWith("/") ? "" : "/"}${image}`;
}

export function seoHead(input: SeoHeadInput) {
  const url = `${BASE_URL}${input.path}`;
  const image = absolute(input.image ?? DEFAULT_OG_IMAGE);

  const meta: Array<Record<string, string>> = [
    { title: input.title },
    { name: "description", content: input.description },
    { property: "og:title", content: input.title },
    { property: "og:description", content: input.description },
    { property: "og:type", content: input.ogType ?? "website" },
    { property: "og:url", content: url },
    { property: "og:image", content: image },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: input.title },
    { name: "twitter:description", content: input.description },
    { name: "twitter:image", content: image },
    { name: "robots", content: input.noindex ? "noindex, follow" : "index, follow" },
  ];

  // Canonical bara på indexerbara sidor — noindex-sidor ska inte annonsera
  // sig själva som kanoniska mål.
  const links = input.noindex ? [] : [{ rel: "canonical", href: url }];

  return { meta, links };
}
