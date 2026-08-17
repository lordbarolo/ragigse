// Klientexport av CV-utkast: Markdown → DOCX (docx-paketet) och Markdown → PDF (jspdf).
// Text-baserad PDF (ingen canvas-raster) så att texten förblir markerbar och ATS-läsbar.
// Svenska tecken (å ä ö) hanteras av UTF-8 i DOCX och WinAnsi-kodningen i jsPDF:s standardfonter.

import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
} from "docx";
import { jsPDF } from "jspdf";

export interface CvInlineSegment {
  text: string;
  bold: boolean;
  italic: boolean;
}

export interface CvBlock {
  type: "h1" | "h2" | "h3" | "p" | "li" | "hr";
  segments: CvInlineSegment[];
}

/** Delar upp en rad i segment utifrån **fetstil** och *kursiv*. Backticks tas bort. */
function parseInline(text: string): CvInlineSegment[] {
  const cleaned = text.replace(/`/g, "");
  const segments: CvInlineSegment[] = [];
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*|__[^_]+__|_[^_]+_)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(cleaned)) !== null) {
    if (match.index > last) {
      segments.push({ text: cleaned.slice(last, match.index), bold: false, italic: false });
    }
    const token = match[0];
    if (token.startsWith("**") || token.startsWith("__")) {
      segments.push({ text: token.slice(2, -2), bold: true, italic: false });
    } else {
      segments.push({ text: token.slice(1, -1), bold: false, italic: true });
    }
    last = match.index + token.length;
  }
  if (last < cleaned.length) {
    segments.push({ text: cleaned.slice(last), bold: false, italic: false });
  }
  return segments.length > 0 ? segments : [{ text: cleaned, bold: false, italic: false }];
}

/** Radbaserad Markdown-parser för CV-strukturen (rubriker, punktlistor, stycken, avdelare). */
export function parseCvMarkdown(markdown: string): CvBlock[] {
  const blocks: CvBlock[] = [];
  for (const rawLine of markdown.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line)) {
      blocks.push({ type: "hr", segments: [] });
    } else if (line.startsWith("### ")) {
      blocks.push({ type: "h3", segments: parseInline(line.slice(4)) });
    } else if (line.startsWith("## ")) {
      blocks.push({ type: "h2", segments: parseInline(line.slice(3)) });
    } else if (line.startsWith("# ")) {
      blocks.push({ type: "h1", segments: parseInline(line.slice(2)) });
    } else if (/^[-*•]\s+/.test(line)) {
      blocks.push({ type: "li", segments: parseInline(line.replace(/^[-*•]\s+/, "")) });
    } else if (/^\d+\.\s+/.test(line)) {
      blocks.push({ type: "li", segments: parseInline(line.replace(/^\d+\.\s+/, "")) });
    } else {
      blocks.push({ type: "p", segments: parseInline(line) });
    }
  }
  return blocks;
}

/**
 * Filnamn baserat på konsultens namn. Namnet hämtas från CV:ts H1-rubrik
 * (eller angivet fallbackNamn). Utan namn används det neutrala filnamnet.
 */
export function cvFileName(markdown: string, ext: "docx" | "pdf" | "md", fallbackName?: string | null): string {
  const h1 = markdown.split("\n").find((l) => /^#\s+\S/.test(l.trim()));
  const raw = (h1 ? h1.trim().replace(/^#\s+/, "") : (fallbackName ?? "")).replace(/[*_`]/g, "").trim();
  const slug = raw
    .toLowerCase()
    .replace(/[åä]/g, "a")
    .replace(/ö/g, "o")
    .replace(/é/g, "e")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug ? `cv-${slug}.${ext}` : `cv-vardbemanning.${ext}`;
}

function triggerDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

// =============================================================
// DOCX
// =============================================================

export async function downloadCvAsDocx(
  markdown: string,
  fileName = "cv-vardbemanning.docx",
  design: CvDesign = FALLBACK_CV_TEMPLATES[0]!.design,
): Promise<void> {
  const blocks = parseCvMarkdown(markdown);
  const tight = design.lineFactor < 1.4;

  const children = blocks.map((block) => {
    const upper = block.type === "h2" && design.uppercaseH2;
    const runs = block.segments.map(
      (seg) =>
        new TextRun({
          text: upper ? seg.text.toUpperCase() : seg.text,
          bold: seg.bold,
          italics: seg.italic,
          ...(upper ? { characterSpacing: 20 } : {}),
        }),
    );
    switch (block.type) {
      case "h1":
        return new Paragraph({
          heading: HeadingLevel.HEADING_1,
          spacing: { after: tight ? 110 : 160 },
          children: runs,
        });
      case "h2":
        return new Paragraph({
          heading: HeadingLevel.HEADING_2,
          spacing: { before: tight ? 200 : 280, after: tight ? 80 : 120 },
          ...(design.showRule
            ? {
                border: {
                  bottom: {
                    style: BorderStyle.SINGLE,
                    size: 4,
                    color: design.rule,
                    space: 2,
                  },
                },
              }
            : {}),
          children: runs,
        });
      case "h3":
        return new Paragraph({
          heading: HeadingLevel.HEADING_3,
          spacing: { before: tight ? 140 : 200, after: tight ? 60 : 80 },
          children: runs,
        });
      case "li":
        return new Paragraph({
          bullet: { level: 0 },
          spacing: { after: tight ? 40 : 60 },
          children: runs,
        });
      case "hr":
        return new Paragraph({
          spacing: { before: 120, after: 120 },
          border: {
            bottom: { style: BorderStyle.SINGLE, size: 4, color: design.rule, space: 1 },
          },
          children: [],
        });
      default:
        return new Paragraph({
          alignment: AlignmentType.LEFT,
          spacing: { after: tight ? 70 : 100 },
          children: runs,
        });
    }
  });

  const pt = (size: number) => Math.round(size * 2);
  const marginDxa = Math.round(design.margin * 20);

  const doc = new Document({
    styles: {
      default: {
        document: { run: { font: design.fontDocx, size: pt(design.body) } },
        heading1: {
          run: { font: design.fontDocx, size: pt(design.h1), bold: true, color: design.accent },
        },
        heading2: {
          run: { font: design.fontDocx, size: pt(design.h2), bold: true, color: design.accent },
        },
        heading3: {
          run: { font: design.fontDocx, size: pt(design.h3), bold: true, color: "333333" },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: marginDxa,
              right: marginDxa,
              bottom: marginDxa,
              left: marginDxa,
            },
          },
        },
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  triggerDownload(blob, fileName);
}

// =============================================================
// PDF
// =============================================================

const PAGE = { width: 595.28, height: 841.89 }; // A4 i pt

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16) || 0,
    parseInt(h.slice(2, 4), 16) || 0,
    parseInt(h.slice(4, 6), 16) || 0,
  ];
}

export function downloadCvAsPdf(
  markdown: string,
  fileName = "cv-vardbemanning.pdf",
  design: CvDesign = FALLBACK_CV_TEMPLATES[0]!.design,
): void {
  const blocks = parseCvMarkdown(markdown);
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margin = design.margin;
  const maxWidth = PAGE.width - margin * 2;
  const accent = hexToRgb(design.accent);
  const rule = hexToRgb(design.rule);
  let y = margin;

  const ensureSpace = (needed: number) => {
    if (y + needed > PAGE.height - margin) {
      doc.addPage();
      y = margin;
    }
  };

  const setFont = (size: number, bold: boolean, italic: boolean) => {
    doc.setFontSize(size);
    doc.setFont(
      design.fontPdf,
      bold && italic ? "bolditalic" : bold ? "bold" : italic ? "italic" : "normal",
    );
  };

  // Ordvis layout med radbrytning så att fetstil mitt i en rad bevaras.
  const drawSegments = (
    segments: CvInlineSegment[],
    fontSize: number,
    indent: number,
    baseBold = false,
    uppercase = false,
  ) => {
    const lineHeight = fontSize * design.lineFactor;
    const startX = margin + indent;
    let x = startX;
    ensureSpace(lineHeight);
    for (const seg of segments) {
      const bold = baseBold || seg.bold;
      setFont(fontSize, bold, seg.italic);
      const text = uppercase ? seg.text.toUpperCase() : seg.text;
      const words = text.split(/(\s+)/).filter((w) => w.length > 0);
      for (const word of words) {
        const width = doc.getTextWidth(word);
        if (x + width > margin + maxWidth && x > startX) {
          y += lineHeight;
          ensureSpace(lineHeight);
          x = startX;
          if (/^\s+$/.test(word)) continue; // inga inledande mellanslag på ny rad
        }
        doc.text(word, x, y);
        x += width;
      }
    }
    y += lineHeight;
  };

  for (const block of blocks) {
    switch (block.type) {
      case "h1":
        ensureSpace(design.h1 * design.lineFactor + 6);
        doc.setTextColor(accent[0], accent[1], accent[2]);
        drawSegments(block.segments, design.h1, 0, true);
        doc.setTextColor(20, 20, 20);
        y += 4;
        break;
      case "h2": {
        y += design.lineFactor < 1.4 ? 6 : 10;
        ensureSpace(design.h2 * design.lineFactor + 8);
        doc.setTextColor(accent[0], accent[1], accent[2]);
        drawSegments(block.segments, design.h2, 0, true, design.uppercaseH2);
        doc.setTextColor(20, 20, 20);
        if (design.showRule) {
          const ruleY = y - design.h2 * design.lineFactor + design.h2 * 0.35;
          doc.setDrawColor(rule[0], rule[1], rule[2]);
          doc.setLineWidth(0.6);
          doc.line(margin, ruleY, margin + maxWidth, ruleY);
        }
        y += 2;
        break;
      }
      case "h3":
        y += design.lineFactor < 1.4 ? 4 : 6;
        ensureSpace(design.h3 * design.lineFactor);
        drawSegments(block.segments, design.h3, 0, true);
        break;
      case "li": {
        const lineHeight = design.body * design.lineFactor;
        ensureSpace(lineHeight);
        setFont(design.body, false, false);
        doc.text("•", margin + 4, y);
        drawSegments(block.segments, design.body, 16);
        break;
      }
      case "hr":
        y += 6;
        ensureSpace(12);
        doc.setDrawColor(rule[0], rule[1], rule[2]);
        doc.setLineWidth(0.5);
        doc.line(margin, y, margin + maxWidth, y);
        y += 12;
        break;
      default:
        drawSegments(block.segments, design.body, 0);
        y += 2;
        break;
    }
  }

  doc.save(fileName);
}
