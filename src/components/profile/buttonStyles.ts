/**
 * Knapphierarki för det mörka profil-/arbetsyteskalet. Tre nivåer, inget mer.
 * Primär: vit fyllning, 44 px — max en per vy.
 * Sekundär: white/10-yta, 40 px.
 * Tertiär: endast text/ikon, 36 px.
 */
export const btnPrimary =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-white px-6 text-sm font-semibold text-[#0b0c10] transition-opacity hover:opacity-90 disabled:opacity-50";

export const btnSecondary =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-white/15 bg-white/10 px-5 text-sm font-medium text-white transition-colors hover:bg-white/[0.16] disabled:opacity-50";

export const btnTertiary =
  "inline-flex min-h-9 items-center justify-center gap-1.5 rounded-full px-3 text-sm font-medium text-white/65 transition-colors hover:text-white disabled:opacity-50";

/** Segmenterad kontroll för tabbar — ska inte kunna förväxlas med en knapp. */
export const segmentedGroup =
  "inline-flex items-center gap-1 rounded-xl border border-white/10 bg-white/[0.04] p-1";

export function segmentedItem(active: boolean): string {
  return (
    "inline-flex min-h-9 items-center rounded-lg px-3.5 text-xs font-medium transition-colors " +
    (active ? "bg-white/[0.14] text-white" : "text-white/55 hover:text-white/85")
  );
}
