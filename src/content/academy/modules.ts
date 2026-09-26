/**
 * The module list.
 *
 * `idx` matches both the `id="m{idx}"` on each section and the
 * `data-quiz="{idx}"` on its knowledge check in course.html, and it is what
 * lands in academy_progress.module_idx. Change one and you change all three.
 *
 * Module 8, the Practice Lab, has no knowledge check — it is assessed on four
 * completed returns and a live interview instead. `hasQuiz: false` is what
 * keeps it out of the progress denominator, so "8 of 8 complete" means the
 * eight checks that exist rather than nine modules with one permanently
 * unfinishable.
 */

export type AcademyModule = {
  idx: number;
  /** Short label for the side navigation. */
  short: string;
  /** Full title, as the module itself heads it. */
  title: string;
  /** Which teaching week it belongs to, for the dashboard and the sign-in page. */
  week: string;
  hasQuiz: boolean;
};

export const modules: AcademyModule[] = [
  {
    idx: 0,
    short: "Requirements & Responsibilities",
    title: "Professional Requirements & Responsibilities",
    week: "Week 1",
    hasQuiz: true,
  },
  {
    idx: 1,
    short: "The 1040",
    title: "The 1040, End to End",
    week: "Weeks 1–2",
    hasQuiz: true,
  },
  {
    idx: 2,
    short: "Filing Status",
    title: "Filing Status",
    week: "Week 3",
    hasQuiz: true,
  },
  {
    idx: 3,
    short: "The EITC",
    title: "The Earned Income Tax Credit",
    week: "Weeks 4–5",
    hasQuiz: true,
  },
  {
    idx: 4,
    short: "Side Hustles",
    title: "Side Hustles and Schedule C",
    week: "Week 6",
    hasQuiz: true,
  },
  {
    idx: 5,
    short: "Special Situations",
    title: "Special Situations & the New Deductions",
    week: "Week 7",
    hasQuiz: true,
  },
  {
    idx: 6,
    short: "Michigan & Detroit",
    title: "Michigan & Detroit Returns",
    week: "Week 8",
    hasQuiz: true,
  },
  {
    idx: 7,
    short: "Software & Clients",
    title: "The Software and the Client",
    week: "Week 9",
    hasQuiz: true,
  },
  {
    idx: 8,
    short: "Practice Lab",
    title: "Practice Lab",
    week: "Week 10",
    hasQuiz: false,
  },
];

/** The eight modules a student can actually pass online. */
export const quizModules = modules.filter((m) => m.hasQuiz);

/** 70% on a knowledge check, unlimited retakes. The one number the course,
 *  the workbook and this code all have to agree on. */
export const PASS_MARK = 70;
