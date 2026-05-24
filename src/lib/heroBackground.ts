import type { CSSProperties } from "react";

/**
 * Hero-bakgrund (samma som /demo och /):
 * Varm off-white #EEEBE4 + tre mjuka mesh-gradients (cyan, violett, grön).
 * Använd som inline style på en root-container med min-h-screen.
 */
export const heroBackgroundStyle: CSSProperties = {
  backgroundColor: "#EEEBE4",
  backgroundImage: [
    "radial-gradient(ellipse 70% 55% at 15% 25%, hsl(196 100% 50% / 0.18) 0%, transparent 55%)",
    "radial-gradient(ellipse 55% 50% at 85% 20%, hsl(245 58% 60% / 0.14) 0%, transparent 50%)",
    "radial-gradient(ellipse 50% 60% at 55% 85%, hsl(160 60% 45% / 0.10) 0%, transparent 50%)",
  ].join(", "),
  backgroundAttachment: "fixed",
  backgroundRepeat: "no-repeat",
};
