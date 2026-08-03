/**
 * Lightweight runtime updater for SEO + social-share meta tags.
 * Used on dynamic routes where we can't rely on the static index.html title/description.
 *
 * Updates:
 *  - <title>
 *  - <meta name="description">
 *  - <meta property="og:title">
 *  - <meta property="og:description">
 *  - <meta property="og:url">
 *  - <link rel="canonical">
 *  - <meta name="twitter:title">
 *  - <meta name="twitter:description">
 *
 * Missing tags are created on the fly so the call is idempotent.
 *
 * `path` defaults to the current location pathname; pass an explicit value for
 * routes that want a canonical URL different from the visited path.
 */
const SITE_ORIGIN = "https://vardbemanning.ai";

export function setPageMeta({
  title,
  description,
  path,
}: {
  title: string;
  description: string;
  path?: string;
}) {
  if (typeof document === "undefined") return;

  document.title = title;

  const ensure = <T extends HTMLElement>(selector: string, create: () => T): T => {
    let el = document.head.querySelector<T>(selector);
    if (!el) {
      el = create();
      document.head.appendChild(el);
    }
    return el;
  };

  const setNamed = (name: string, content: string) => {
    const el = ensure<HTMLMetaElement>(`meta[name="${name}"]`, () => {
      const m = document.createElement("meta");
      m.setAttribute("name", name);
      return m;
    });
    el.setAttribute("content", content);
  };

  const setProperty = (property: string, content: string) => {
    const el = ensure<HTMLMetaElement>(`meta[property="${property}"]`, () => {
      const m = document.createElement("meta");
      m.setAttribute("property", property);
      return m;
    });
    el.setAttribute("content", content);
  };

  const setCanonical = (href: string) => {
    const el = ensure<HTMLLinkElement>('link[rel="canonical"]', () => {
      const l = document.createElement("link");
      l.setAttribute("rel", "canonical");
      return l;
    });
    el.setAttribute("href", href);
  };

  setNamed("description", description);
  setProperty("og:title", title);
  setProperty("og:description", description);
  setNamed("twitter:title", title);
  setNamed("twitter:description", description);

  const resolvedPath =
    path ??
    (typeof window !== "undefined" && window.location?.pathname ? window.location.pathname : "/");
  const url = `${SITE_ORIGIN}${resolvedPath.startsWith("/") ? resolvedPath : `/${resolvedPath}`}`;
  setProperty("og:url", url);
  setCanonical(url);
}
