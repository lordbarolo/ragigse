/**
 * Serializes a value as JSON for safe inlining inside a <script type="application/ld+json">
 * tag. Escapes "</" sequences so an attacker can't break out of the script context
 * via a stray "</script>" inside data-driven JSON-LD.
 *
 * Always use this instead of JSON.stringify() when the result will be rendered
 * via dangerouslySetInnerHTML or inserted into a <script> element.
 */
export function safeJsonLd(value: unknown): string {
  return JSON.stringify(value)
    .replace(/<\//g, "<\\/")
    .replace(/<!--/g, "<\\!--")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}
