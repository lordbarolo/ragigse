/**
 * Lightweight runtime updater for SEO + social-share meta tags.
 * Used on dynamic routes where we can't rely on the static index.html title/description.
 *
 * Updates:
 *  - <title>
 *  - <meta name="description">
 *  - <meta property="og:title">
 *  - <meta property="og:description">
 *  - <meta name="twitter:title">
 *  - <meta name="twitter:description">
 *
 * Missing tags are created on the fly so the call is idempotent.
 */
export function setPageMeta({ title, description }: { title: string; description: string }) {
  if (typeof document === "undefined") return;

  document.title = title;

  const ensure = (selector: string, create: () => HTMLMetaElement) => {
    let el = document.head.querySelector<HTMLMetaElement>(selector);
    if (!el) {
      el = create();
      document.head.appendChild(el);
    }
    return el;
  };

  const setNamed = (name: string, content: string) => {
    const el = ensure(`meta[name="${name}"]`, () => {
      const m = document.createElement("meta");
      m.setAttribute("name", name);
      return m;
    });
    el.setAttribute("content", content);
  };

  const setProperty = (property: string, content: string) => {
    const el = ensure(`meta[property="${property}"]`, () => {
      const m = document.createElement("meta");
      m.setAttribute("property", property);
      return m;
    });
    el.setAttribute("content", content);
  };

  setNamed("description", description);
  setProperty("og:title", title);
  setProperty("og:description", description);
  setNamed("twitter:title", title);
  setNamed("twitter:description", description);
}
