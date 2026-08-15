/**
 * Färgpaletter.
 *
 * `original` = exakt de värden som ligger i handoff-designen.
 * `site`     = samma design, men med startsidans faktiska hexvärden
 *              (src/pages/Startsida.tsx och startsida5c-komponenterna) så att
 *              scenen kan läggas kant-i-kant i en befintlig sektion utan skarv.
 *
 * Accentfärgen är #00D2E6 i båda varianterna — det är sajtens theme-color och
 * fungerar lika bra mot ljus som mörk bakgrund.
 */

export type Variant = 'original' | 'site';

export const ACCENT_DEFAULT = '#00D2E6';

/** Ljusa scener: Lönekollen och Missade timmar. */
export type LightPalette = {
  BG: string;
  INK: string;
  DIM: string;
  LINE: string;
  SURFACE: string;
  /** Bakgrund i mätarstaplar och tomma ytor. */
  TRACK: string;
  /** Fyllnad i passblock i veckokalendern. */
  BLOCK: string;
  /** Sekundär stapelfärg (löntagarnivån). */
  TRACK_FILL: string;
  /** Skuggfärg som rgba-sträng utan alpha-suffix, t.ex. "7,51,61". */
  SHADOW_RGB: string;
  /** Bakgrundsplatta bakom veckokolumnerna (färdig färgsträng). */
  PLATE: string;
  /** Textfärg ovanpå accentfärgade ytor. */
  ON_ACCENT: string;
  CAPTION: string;
};


/** Mörk scen: Assistenten. */
export type DarkPalette = {
  BG: string;
  PANEL: string;
  PANEL2: string;
  TXT: string;
  DIM: string;
  LINE: string;
  /** Textfärg ovanpå accentfärgade ytor. */
  ON_ACCENT: string;
  CAPTION: string;
};

export const LIGHT: Record<Variant, LightPalette> = {
  original: {
    BG: '#F4FAFB',
    INK: '#07333D',
    DIM: '#5C7F86',
    LINE: '#DCEBEE',
    SURFACE: '#FFFFFF',
    TRACK: '#EAF4F6',
    BLOCK: '#E5F0F2',
    TRACK_FILL: '#9BC7CE',
    SHADOW_RGB: '7,51,61',
    PLATE: 'rgba(7,51,61,0.028)',
    ON_ACCENT: '#07333D',
    CAPTION: '#3E6069',
  },
  site: {
    BG: '#F5F5F7',
    INK: '#1A1B22',
    DIM: '#5A5B62',
    LINE: '#E3E3E8',
    SURFACE: '#FFFFFF',
    TRACK: '#ECECEF',
    BLOCK: '#E8E8EC',
    TRACK_FILL: '#B6BCC2',
    SHADOW_RGB: '26,27,34',
    PLATE: 'rgba(26,27,34,0.028)',
    ON_ACCENT: '#1A1B22',
    CAPTION: '#4A4B52',
  },
};

/**
 * Mörk variant av de ljusa scenerna. Samma token-namn som `LightPalette`,
 * så att scenens JSX kan vara temaneutral.
 */
export const SCENE_DARK: Record<Variant, LightPalette> = {
  original: {
    BG: '#051E24',
    INK: '#E9F6F8',
    DIM: '#9FC8CE',
    LINE: 'rgba(159,224,232,0.14)',
    SURFACE: '#0A2E38',
    TRACK: '#0E3944',
    BLOCK: '#12404C',
    TRACK_FILL: '#3E7E89',
    SHADOW_RGB: '0,0,0',
    PLATE: 'rgba(159,224,232,0.05)',
    ON_ACCENT: '#05262C',
    CAPTION: '#BFE6EB',
  },
  site: {
    BG: '#0B0C10',
    INK: '#FFFFFF',
    DIM: '#A8AAB4',
    LINE: 'rgba(255,255,255,0.10)',
    SURFACE: '#16171F',
    TRACK: '#1E1F28',
    BLOCK: '#22232D',
    TRACK_FILL: '#4A4C58',
    SHADOW_RGB: '0,0,0',
    PLATE: 'rgba(255,255,255,0.05)',
    ON_ACCENT: '#0B0C10',
    CAPTION: '#C4C6CE',
  },
};


export const DARK: Record<Variant, DarkPalette> = {
  original: {
    BG: '#051E24',
    PANEL: '#0A2E38',
    PANEL2: '#0E3944',
    TXT: '#E9F6F8',
    DIM: '#7FA9B0',
    LINE: 'rgba(159,224,232,0.14)',
    ON_ACCENT: '#05262C',
    CAPTION: '#BFE6EB',
  },
  site: {
    BG: '#0B0C10',
    PANEL: '#16171F',
    PANEL2: '#1E1F28',
    TXT: '#FFFFFF',
    DIM: '#9B9DA7',
    LINE: 'rgba(255,255,255,0.10)',
    ON_ACCENT: '#0B0C10',
    CAPTION: '#C4C6CE',
  },
};

/** Gemensamma props för alla tre scener. */
export type SceneProps = {
  /** Färgvariant. Standard `original` (exakt som designen levererades). */
  variant?: Variant;
  /** Accentfärg. Standard #00D2E6. */
  accent?: string;
  /** Visa textremsor. Standard true. */
  captions?: boolean;
  /** Loopa. Standard true. */
  loop?: boolean;
  /** Visa varumärkesavslutet (logga + tagline). Standard true. */
  brand?: boolean;
  /** Färgtema. Standard 'light'. */
  theme?: 'light' | 'dark';

  /** Tvinga stillbild (t.ex. i en modal som inte syns). */
  paused?: boolean;
  /** Tid i sekunder som visas vid prefers-reduced-motion. */
  posterTime?: number;
  /** Rundade hörn. Standard 0 — sätt t.ex. 16 för att matcha korten på startsidan. */
  radius?: number | string;
  className?: string;
  style?: React.CSSProperties;
  /**
   * Skärmläsartext. Varje scen har en beskrivande standardtext.
   * Skicka tom sträng för att markera scenen som rent dekorativ (aria-hidden).
   */
  ariaLabel?: string;
};
