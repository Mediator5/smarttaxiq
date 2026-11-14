/**
 * The certificate, built as a PDF by hand.
 *
 * No library. The project has exactly one runtime dependency — the Supabase
 * client — and a single sheet of paper with eleven lines of text on it is not
 * worth breaking that for. What a PDF actually needs is a handful of objects,
 * a content stream of drawing operators, and a byte-offset table, all of which
 * are below.
 *
 * The only fiddly part is centring text, which needs to know how wide a string
 * is before it is drawn. The three fonts used here are among the fourteen every
 * PDF reader already has, so there is nothing to embed — but it does mean
 * carrying their character widths, which is what WIDTHS is. The numbers are the
 * standard metrics for Helvetica, Times-Roman and Times-Bold.
 *
 * Text is written in WinAnsi, which covers every accented Latin character a
 * name on this roster is likely to contain.
 */

type FontName = "Helvetica" | "Helvetica-Bold" | "Times-Roman" | "Times-Bold";

/** Character widths, in thousandths of the font size, for ASCII 32–126. */
const WIDTHS: Record<FontName, number[]> = {
  Helvetica: [
    278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278,
    278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584,
    584, 556, 1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556,
    833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278,
    278, 278, 469, 556, 333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222,
    500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500,
    500, 334, 260, 334, 584,
  ],
  "Helvetica-Bold": [
    278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278,
    278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 333, 333, 584, 584,
    584, 611, 975, 722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611,
    833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 333,
    278, 333, 584, 556, 333, 556, 611, 556, 611, 556, 333, 611, 611, 278, 278,
    556, 278, 889, 611, 611, 611, 611, 389, 556, 333, 611, 556, 778, 556, 556,
    500, 389, 280, 389, 584,
  ],
  "Times-Roman": [
    250, 333, 408, 500, 500, 833, 778, 180, 333, 333, 500, 564, 250, 333, 250,
    278, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 278, 278, 564, 564,
    564, 444, 921, 722, 667, 667, 722, 611, 556, 722, 722, 333, 389, 722, 611,
    889, 722, 722, 556, 722, 667, 556, 611, 722, 722, 944, 722, 722, 611, 333,
    278, 333, 469, 500, 333, 444, 500, 444, 500, 444, 333, 500, 500, 278, 278,
    500, 278, 778, 500, 500, 500, 500, 333, 389, 278, 500, 500, 722, 500, 500,
    444, 480, 200, 480, 541,
  ],
  "Times-Bold": [
    250, 333, 555, 500, 500, 1000, 833, 278, 333, 333, 500, 570, 250, 333, 250,
    278, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 333, 333, 570, 570,
    570, 500, 930, 722, 667, 722, 722, 667, 611, 778, 778, 389, 500, 778, 667,
    944, 722, 778, 611, 778, 722, 556, 667, 722, 722, 1000, 722, 722, 667, 333,
    278, 333, 581, 500, 333, 500, 556, 444, 556, 444, 333, 500, 556, 278, 333,
    556, 278, 833, 556, 500, 556, 556, 444, 389, 333, 556, 500, 722, 500, 500,
    444, 394, 220, 394, 520,
  ],
};

/** Anything outside ASCII falls back to a sensible average rather than zero. */
function charWidth(font: FontName, code: number): number {
  if (code >= 32 && code <= 126) return WIDTHS[font][code - 32];
  if (code >= 192 && code <= 255) return WIDTHS[font][33]; // an accented capital
  return WIDTHS[font][18];
}

function textWidth(
  text: string,
  font: FontName,
  size: number,
  tracking = 0
): number {
  let total = 0;
  for (const ch of text) total += charWidth(font, ch.charCodeAt(0));
  return (total / 1000) * size + tracking * Math.max(0, text.length - 1);
}

/** Only three characters are special inside a PDF string literal. */
function escapePdf(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

/* ------------------------------------------------------------ the drawing */

const PAGE_W = 792; // Letter, landscape
const PAGE_H = 612;

const INK = "0.031 0.094 0.251"; // #081840
const GOLD = "0.847 0.690 0.220"; // #d8b038
const MUTED = "0.42 0.45 0.52";

const FONT_KEY: Record<FontName, string> = {
  Helvetica: "/F1",
  "Helvetica-Bold": "/F2",
  "Times-Roman": "/F3",
  "Times-Bold": "/F4",
};

type Op = string;

function centredText(
  ops: Op[],
  text: string,
  font: FontName,
  size: number,
  y: number,
  color: string,
  tracking = 0
) {
  const x = (PAGE_W - textWidth(text, font, size, tracking)) / 2;
  ops.push(
    `BT ${color} rg ${FONT_KEY[font]} ${size} Tf ${tracking} Tc 1 0 0 1 ${x.toFixed(
      2
    )} ${y} Tm (${escapePdf(text)}) Tj 0 Tc ET`
  );
}

function leftText(
  ops: Op[],
  text: string,
  font: FontName,
  size: number,
  x: number,
  y: number,
  color: string
) {
  ops.push(
    `BT ${color} rg ${FONT_KEY[font]} ${size} Tf 1 0 0 1 ${x} ${y} Tm (${escapePdf(
      text
    )}) Tj ET`
  );
}

/** Greedy wrap, because the one paragraph on the page is three lines long. */
function wrap(
  text: string,
  font: FontName,
  size: number,
  maxWidth: number
): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (textWidth(candidate, font, size) > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function rule(ops: Op[], x1: number, x2: number, y: number, color: string, w = 1) {
  ops.push(
    `${color} RG ${w} w ${x1} ${y} m ${x2} ${y} l S`
  );
}

export type CertificateInput = {
  /** As it appears on the roster. This is the whole point of the document. */
  name: string;
  cohort: string;
  certificateNo: string;
  passedAt: Date;
  /** Part scores, where the exam was sat online. Omitted for a paper sitting. */
  parts?: { part: string; awarded: number; available: number }[];
  /** Who signs it. */
  instructor: string;
};

/**
 * One page, drawn top to bottom.
 *
 * Deliberately sober: this is a document a preparer may show a client or put
 * in a file, and a certificate that looks like a party invitation would not
 * survive that. The ink and gold are the site's own two colours.
 */
function contentStream(input: CertificateInput): string {
  const ops: Op[] = [];

  // A deep ink border with a gold hairline just inside it.
  ops.push(`${INK} rg 0 0 ${PAGE_W} ${PAGE_H} re f`);
  ops.push(`1 1 1 rg 18 18 ${PAGE_W - 36} ${PAGE_H - 36} re f`);
  ops.push(
    `${GOLD} RG 1.5 w 30 30 ${PAGE_W - 60} ${PAGE_H - 60} re S`
  );

  const date = input.passedAt.toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "America/Detroit",
  });

  centredText(ops, "SMART TAX IQ TAX ACADEMY", "Helvetica-Bold", 11, 528, MUTED, 2.4);
  rule(ops, 330, 462, 514, GOLD, 1.2);

  centredText(ops, "Certificate of Completion", "Times-Bold", 31, 466, INK);

  centredText(ops, "This certifies that", "Times-Roman", 13, 432, MUTED);

  // A double-barrelled name at 40pt can be wider than the page. Step the size
  // down until it fits rather than letting it run off the edge, and widen the
  // gold rule under it to whichever is wider, the name or its minimum.
  let nameSize = 40;
  while (nameSize > 20 && textWidth(input.name, "Times-Bold", nameSize) > 620) {
    nameSize -= 1;
  }
  centredText(ops, input.name, "Times-Bold", nameSize, 384, INK);

  const nameWidth = textWidth(input.name, "Times-Bold", nameSize);
  const ruleHalf = Math.min(300, Math.max(140, nameWidth / 2 + 28));
  rule(ops, PAGE_W / 2 - ruleHalf, PAGE_W / 2 + ruleHalf, 372, GOLD, 0.8);

  const body =
    "has completed the ten-week Seasonal Preparer Training program and passed the final " +
    "examination in all four parts: filing status, the Earned Income Tax Credit, a complete " +
    "return, and ethics and due diligence.";

  let y = 342;
  for (const line of wrap(body, "Times-Roman", 13, 560)) {
    centredText(ops, line, "Times-Roman", 13, y, INK);
    y -= 20;
  }

  // The marks, where there are marks to show.
  if (input.parts?.length) {
    const scores = input.parts
      .map((p) => `Part ${p.part} ${p.awarded}/${p.available}`)
      .join("     ");
    centredText(ops, scores, "Helvetica", 10.5, y - 8, MUTED, 0.4);
    y -= 8;
  }

  // Signature block, left; record block, right.
  const baseline = 212;
  rule(ops, 72, 352, baseline, MUTED, 0.6);
  leftText(ops, input.instructor, "Times-Bold", 12, 72, baseline - 20, INK);
  leftText(ops, "Instructor", "Helvetica", 9.5, 72, baseline - 36, MUTED);
  leftText(
    ops,
    "Carter Cole & Associates LLC",
    "Helvetica",
    9.5,
    72,
    baseline - 50,
    MUTED
  );

  rule(ops, 440, 720, baseline, MUTED, 0.6);
  leftText(ops, date, "Times-Bold", 12, 440, baseline - 20, INK);
  leftText(ops, "Date passed", "Helvetica", 9.5, 440, baseline - 36, MUTED);
  leftText(
    ops,
    `Cohort ${input.cohort}   ·   Certificate ${input.certificateNo}`,
    "Helvetica",
    9.5,
    440,
    baseline - 50,
    MUTED
  );

  centredText(
    ops,
    "14701 Mack Ave Suite B, Detroit MI 48215   ·   313-771-4400   ·   smarttaxiq.com",
    "Helvetica",
    8.5,
    72,
    MUTED,
    0.3
  );

  return ops.join("\n");
}

/* -------------------------------------------------------------- the file -- */

/**
 * Assemble the PDF.
 *
 * Seven objects: the catalog, the page tree, the page, the content stream and
 * three fonts. Offsets are collected as the body is written and the xref table
 * is emitted from them, which is the only part of the format that cares about
 * byte positions.
 */
export function certificatePdf(input: CertificateInput): Buffer {
  const stream = contentStream(input);

  const objects: string[] = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] ` +
      "/Resources << /Font << /F1 5 0 R /F2 6 0 R /F3 7 0 R /F4 8 0 R >> >> " +
      "/Contents 4 0 R >>",
    `<< /Length ${Buffer.byteLength(stream, "latin1")} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Times-Roman /Encoding /WinAnsiEncoding >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Times-Bold /Encoding /WinAnsiEncoding >>",
  ];

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];

  objects.forEach((body, i) => {
    offsets.push(Buffer.byteLength(pdf, "latin1"));
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });

  const xrefAt = Buffer.byteLength(pdf, "latin1");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  }
  pdf +=
    `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\n` +
    `startxref\n${xrefAt}\n%%EOF\n`;

  return Buffer.from(pdf, "latin1");
}

/** certificate-lashanda-carter.pdf, rather than a uuid. */
export function certificateFileName(name: string): string {
  const slug =
    name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60) || "student";
  return `smarttaxiq-certificate-${slug}.pdf`;
}
