// Designdefinitioner för CV-export. Värdena bor i databasen (public.cv_templates)
// och läses via cvTemplates.functions.ts. Fallbacken här används bara om läsningen
// misslyckas, så att nedladdning aldrig blockeras av ett nätverksfel.

export interface CvDesign {
  /** Fontnamn för DOCX (Word-installerade fonter). */
  fontDocx: string;
  /** jsPDF:s standardfamiljer. */
  fontPdf: "helvetica" | "times" | "courier";
  /** Rubrikfärg, hex utan #. */
  accent: string;
  /** Färg på sektionslinje, hex utan #. */
  rule: string;
  /** Sidmarginal i pt (PDF). */
  margin: number;
  body: number;
  h1: number;
  h2: number;
  h3: number;
  lineFactor: number;
  uppercaseH2: boolean;
  showRule: boolean;
}

export interface CvTemplate {
  slug: string;
  name: string;
  description: string;
  design: CvDesign;
}

export const DEFAULT_CV_TEMPLATE_SLUG = "klassisk";

export const FALLBACK_CV_TEMPLATES: CvTemplate[] = [
  {
    slug: "klassisk",
    name: "Klassisk",
    description: "Serif-rubriker, tunn sektionslinje och generösa marginaler.",
    design: {
      fontDocx: "Georgia",
      fontPdf: "times",
      accent: "1A1A1A",
      rule: "CCCCCC",
      margin: 64,
      body: 10.5,
      h1: 19,
      h2: 13,
      h3: 11.5,
      lineFactor: 1.5,
      uppercaseH2: false,
      showRule: true,
    },
  },
  {
    slug: "modern",
    name: "Modern",
    description: "Sans-serif med accentfärg i rubriker och sektionslinjer.",
    design: {
      fontDocx: "Calibri",
      fontPdf: "helvetica",
      accent: "534AB7",
      rule: "534AB7",
      margin: 56,
      body: 10.5,
      h1: 21,
      h2: 12.5,
      h3: 11,
      lineFactor: 1.5,
      uppercaseH2: true,
      showRule: true,
    },
  },
  {
    slug: "kompakt",
    name: "Kompakt",
    description: "Tätare rytm och mindre grader för att få plats på färre sidor.",
    design: {
      fontDocx: "Calibri",
      fontPdf: "helvetica",
      accent: "111111",
      rule: "DDDDDD",
      margin: 44,
      body: 9.5,
      h1: 16,
      h2: 11,
      h3: 10,
      lineFactor: 1.3,
      uppercaseH2: true,
      showRule: false,
    },
  },
];

/** Fyller ut ev. saknade fält i databasens jsonb med fallbackens värden. */
export function normalizeDesign(raw: unknown, slug: string): CvDesign {
  const base =
    FALLBACK_CV_TEMPLATES.find((t) => t.slug === slug)?.design ?? FALLBACK_CV_TEMPLATES[0]!.design;
  if (!raw || typeof raw !== "object") return base;
  return { ...base, ...(raw as Partial<CvDesign>) };
}

export function findTemplate(templates: CvTemplate[], slug: string): CvTemplate {
  return (
    templates.find((t) => t.slug === slug) ??
    templates[0] ??
    FALLBACK_CV_TEMPLATES[0]!
  );
}
