import { Helmet } from "react-helmet-async";
import { safeJsonLd } from "@/lib/safeJsonLd";

interface SEOProps {
  title: string;
  description: string;
  path: string;
  ogType?: "website" | "article" | "product";
  /**
   * Optional absolute URL or site-relative path for the page's social-preview
   * image. When omitted, social crawlers fall back to the sitewide og:image
   * declared in index.html. Pass a per-page image to de-genericize previews.
   */
  image?: string;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
  noindex?: boolean;
}

const BASE = "https://www.compcare.se";

function resolveImage(image: string | undefined): string | undefined {
  if (!image) return undefined;
  if (image.startsWith("http://") || image.startsWith("https://")) return image;
  return `${BASE}${image.startsWith("/") ? "" : "/"}${image}`;
}

export function SEO({ title, description, path, ogType = "website", image, jsonLd, noindex = false }: SEOProps) {
  const url = `${BASE}${path}`;
  const resolvedImage = resolveImage(image);
  const lds = noindex || !jsonLd ? [] : Array.isArray(jsonLd) ? jsonLd : [jsonLd];
  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      {noindex && <meta name="robots" content="noindex, nofollow" />}
      <link rel="canonical" href={url} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content={ogType} />
      {resolvedImage && <meta property="og:image" content={resolvedImage} />}
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      {resolvedImage && <meta name="twitter:image" content={resolvedImage} />}
      {lds.map((ld, i) => (
        <script key={i} type="application/ld+json">{safeJsonLd(ld)}</script>
      ))}
    </Helmet>
  );
}


