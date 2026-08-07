import { safeJsonLd } from "@/lib/safeJsonLd";

interface JsonLdProps {
  data: Record<string, unknown> | Record<string, unknown>[];
}

/**
 * Renderar strukturerad data (schema.org) som ett eller flera
 * <script type="application/ld+json">. Sökmotorer och agenter läser JSON-LD
 * oavsett om skriptet ligger i <head> eller <body>.
 *
 * Head-taggar (title/description/canonical/og) hör INTE hit — de sätts i
 * route-filens head() via seoHead() i src/lib/seo/routeHead.ts.
 */
export function JsonLd({ data }: JsonLdProps) {
  const items = Array.isArray(data) ? data : [data];
  return (
    <>
      {items.map((item, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(item) }}
        />
      ))}
    </>
  );
}
