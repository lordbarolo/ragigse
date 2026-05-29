import { Helmet } from "react-helmet-async";
import { safeJsonLd } from "@/lib/safeJsonLd";

interface SEOProps {
  title: string;
  description: string;
  path: string;
  ogType?: "website" | "article" | "product";
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
}

const BASE = "https://www.compcare.se";

export function SEO({ title, description, path, ogType = "website", jsonLd }: SEOProps) {
  const url = `${BASE}${path}`;
  const lds = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : [];
  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content={ogType} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      {lds.map((ld, i) => (
        <script key={i} type="application/ld+json">{safeJsonLd(ld)}</script>
      ))}
    </Helmet>
  );
}
