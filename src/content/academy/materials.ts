/**
 * The Academy's printable materials.
 *
 * The files live in src/content/academy/files/ and are served through
 * /api/academy/materials/[slug], which checks the session first. They are
 * deliberately NOT in public/ — four of the six are answer keys, and anything
 * in public/ is a guessable URL away from being downloaded by a student who
 * is about to sit the exam.
 *
 * `audience` decides who may download:
 *   "student"    — any signed-in member of the roster
 *   "instructor" — instructors only
 */

export type Material = {
  slug: string;
  file: string;
  title: string;
  blurb: string;
  pages: number;
  audience: "student" | "instructor";
  /** Grouping on the materials page. */
  group: "Teach from" | "Give to students" | "Mark with";
};

export const materials: Material[] = [
  {
    slug: "instructor-pack",
    file: "instructor-pack.pdf",
    title: "Instructor Pack",
    blurb:
      "Run sheets for every session, the explanations that land, what students get wrong each year, all 43 knowledge-check answers, and the early-warning table.",
    pages: 45,
    audience: "instructor",
    group: "Teach from",
  },
  {
    slug: "workbook",
    file: "workbook.pdf",
    title: "Student Workbook",
    blurb:
      "Figures sheet, note frames, every scenario as a worksheet, and the six assignments. This is the one to print for in-person classes.",
    pages: 33,
    audience: "student",
    group: "Give to students",
  },
  {
    slug: "practice-returns",
    file: "practice-returns.pdf",
    title: "Practice Returns — client packs",
    blurb:
      "Four client files as facsimile W-2s, 1099s, letters and intake notes. Week 10. Print one set per student.",
    pages: 17,
    audience: "student",
    group: "Give to students",
  },
  {
    slug: "practice-returns-key",
    file: "practice-returns-key.pdf",
    title: "Practice Returns — solution sets",
    blurb:
      "Worked answers, the trap each pack is built around, and the mark weightings. Never give this to a student.",
    pages: 12,
    audience: "instructor",
    group: "Mark with",
  },
  {
    slug: "final-exam",
    file: "final-exam.pdf",
    title: "Final Exam — Paper A",
    blurb:
      "The December paper. Print on the day, not before — and keep the key below separate.",
    pages: 9,
    audience: "instructor",
    group: "Mark with",
  },
  {
    slug: "final-exam-key",
    file: "final-exam-key.pdf",
    title: "Final Exam — key and marking sheet",
    blurb:
      "Full answers, the marking sheet, the certification record, and a Paper B retake set with different scenarios.",
    pages: 18,
    audience: "instructor",
    group: "Mark with",
  },
];

export function materialBySlug(slug: string) {
  return materials.find((m) => m.slug === slug) ?? null;
}

export const materialGroups = [
  "Teach from",
  "Give to students",
  "Mark with",
] as const;
