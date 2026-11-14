/**
 * The final exam, as a student sits it online.
 *
 * This file holds the paper. It does NOT hold a single answer — those live in
 * exam-key.ts, which no client component may import and which only ever
 * reaches the browser through an instructor's marking screen. Keeping the two
 * apart is not tidiness: the knowledge checks in course.html carry their key
 * in the page on purpose, for instant feedback, and an exam that did the same
 * would not be worth marking. Splitting the files makes the rule auditable at
 * a glance rather than by reading every import.
 *
 * Both papers are transcribed from the printed set in
 * src/content/academy/files — final-exam.pdf for Paper A, and the Paper B
 * retake section of final-exam-key.pdf. The fact patterns, the mark
 * allocations and the four pass bars are the printed ones, unchanged, because
 * the online sitting and the paper sitting have to be the same exam.
 *
 * The one deliberate difference: where the paper asks the student to WRITE the
 * filing status and name the deciding test, the online paper asks them to pick
 * both from a list. The lists come from the key's own answers and its own named
 * wrong answers, so the knowledge under test is the same, and it is what makes
 * Parts A and B — 60 of the 100 marks, and both 80% gates — mark themselves.
 * Parts C and D stay written, because a complete return and five ethics
 * answers cannot be multiple-guessed without becoming a different, easier
 * exam. The instructor marks those two with the key beside them.
 */

export type ExamPart = "A" | "B" | "C" | "D";
export type PaperId = "A" | "B";

/* --------------------------------------------------------------- the shape */

export type PartSpec = {
  part: ExamPart;
  title: string;
  /** Marks available in this part. A 30 · B 30 · C 25 · D 15. */
  marks: number;
  /** Marks needed to pass it. A 24 · B 24 · C 18 · D 11. */
  needed: number;
  /** The printed threshold, for display. */
  passPct: number;
  /** The paper's own suggested timing. Guidance, not enforced. */
  allowMinutes: number;
  howMarked: "auto" | "instructor";
  instruction: string;
};

export const PART_SPECS: Record<ExamPart, PartSpec> = {
  A: {
    part: "A",
    title: "Filing status",
    marks: 30,
    needed: 24,
    passPct: 80,
    allowMinutes: 35,
    howMarked: "auto",
    instruction:
      "For each, give the filing status and name the test that decided it. Five marks each: three for the status, two for naming the deciding test.",
  },
  B: {
    part: "B",
    title: "Earned Income Tax Credit",
    marks: 30,
    needed: 24,
    passPct: 80,
    allowMinutes: 35,
    howMarked: "auto",
    instruction:
      "For each: is the credit available, and on how many qualifying children? Then name the test or rule that decided it. Five marks each: three for the outcome, two for the rule.",
  },
  C: {
    part: "C",
    title: "One complete return",
    marks: 25,
    needed: 18,
    passPct: 70,
    allowMinutes: 35,
    howMarked: "instructor",
    instruction:
      "You will not be marked on arithmetic to the cent. You will be marked on whether the return is the right shape, whether you found everything the client is owed, and whether your notes would stand up. Show your working.",
  },
  D: {
    part: "D",
    title: "Ethics and due diligence",
    marks: 15,
    needed: 11,
    passPct: 70,
    allowMinutes: 15,
    howMarked: "instructor",
    instruction:
      "Answer in your own words. Where a question asks what you would ask the client, write the question down — it carries marks on its own.",
  },
};

export const ALL_PARTS: ExamPart[] = ["A", "B", "C", "D"];

/** Two hours, as printed on the paper. Enforced from the server's own clock. */
export const EXAM_MINUTES = 120;

/** Seven days minimum between a sitting and its retake, as the key requires. */
export const RETAKE_WAIT_DAYS = 7;

export const EXAM_WINDOW = "14–18 December 2026";

/* ------------------------------------------------------------ the choices */

export type Choice = { id: string; label: string };

/** The five statuses, and nothing else. */
export const FILING_STATUSES: Choice[] = [
  { id: "single", label: "Single" },
  { id: "mfj", label: "Married Filing Jointly" },
  { id: "mfs", label: "Married Filing Separately" },
  { id: "hoh", label: "Head of Household" },
  { id: "qss", label: "Qualifying Surviving Spouse" },
];

/**
 * The tests that decide a filing status, as the modules name them.
 *
 * Every one of these is the right answer to at least one question across the
 * two papers, and the wrong answer to several — a student who reaches for the
 * dependent-parent exception on Paper B A4 has made exactly the mistake that
 * question is built to catch.
 */
export const DECIDING_TESTS: Choice[] = [
  {
    id: "test1",
    label:
      "Test 1 — unmarried, or considered unmarried, on the last day of the year",
  },
  {
    id: "test2",
    label: "Test 2 — paid more than half the cost of keeping up the home",
  },
  {
    id: "test3",
    label:
      "Test 3 — a qualifying person lived with you for more than half the year",
  },
  {
    id: "considered-unmarried",
    label:
      "Considered unmarried — the spouse was not in the home at any point in the last six months",
  },
  {
    id: "dependent-parent",
    label:
      "The dependent-parent exception — a parent you can claim need not live with you",
  },
  {
    id: "relationship-test",
    label: "The relationship test — a qualifying person must be a relative",
  },
  {
    id: "student-exception",
    label:
      "The age test and its student exception — a full-time student under 24 who is younger than you",
  },
  {
    id: "dec31",
    label: "Marital status is decided on 31 December, whatever the rest of the year looked like",
  },
  {
    id: "year-of-death",
    label: "The year-of-death rule — a joint return is available for the year a spouse dies",
  },
  {
    id: "qss-needs-child",
    label: "Qualifying Surviving Spouse requires a dependent child",
  },
];

/** The EITC rules and tests, in the order the modules teach them. */
export const EITC_RULES: Choice[] = [
  {
    id: "earned-income",
    label: "Earned income — what counts as it, and what does not",
  },
  { id: "ceiling", label: "The income ceiling for that filer and family size" },
  { id: "investment-limit", label: "The investment-income limit" },
  { id: "age-test", label: "The age test for a qualifying child" },
  {
    id: "joint-return-test",
    label: "The joint-return test — the J in R-A-R-J",
  },
  { id: "ssn", label: "A valid Social Security number is required" },
  {
    id: "schedule-c-loss",
    label: "A Schedule C loss reduces earned income",
  },
  {
    id: "tiebreaker-parent",
    label: "Tiebreaker rule 1 — a parent beats a non-parent",
  },
  { id: "tiebreaker-nights", label: "Tiebreaker rule 2 — the most nights" },
  {
    id: "tiebreaker-agi",
    label: "Tiebreaker rules 3 and 4 — the higher AGI wins",
  },
  {
    id: "due-diligence",
    label: "The duty to make reasonable inquiries, and to record them",
  },
];

/* ---------------------------------------------------------- the questions */

export type QuestionA = {
  id: string;
  part: "A";
  marks: number;
  /** Three of the five. */
  statusMarks: number;
  /** The other two. */
  testMarks: number;
  facts: string;
};

export type QuestionB = {
  id: string;
  part: "B";
  marks: number;
  outcomeMarks: number;
  ruleMarks: number;
  facts: string;
  /** Built from the key's own answer and the wrong answers it names. */
  outcomes: Choice[];
};

export type QuestionWritten = {
  id: string;
  part: "C" | "D";
  marks: number;
  prompt: string;
  /** The paper's own sub-heading, where it has one. */
  hint?: string;
  rows: number;
};

export type ClientDocument = { doc: string; details: string };

export type PartCBrief = {
  heading: string;
  client: string;
  documents: ClientDocument[];
  said: string;
  questions: QuestionWritten[];
};

export type Paper = {
  id: PaperId;
  label: string;
  a: QuestionA[];
  b: QuestionB[];
  c: PartCBrief;
  d: QuestionWritten[];
};

const a = (id: string, facts: string): QuestionA => ({
  id,
  part: "A",
  marks: 5,
  statusMarks: 3,
  testMarks: 2,
  facts,
});

const b = (id: string, facts: string, outcomes: Choice[]): QuestionB => ({
  id,
  part: "B",
  marks: 5,
  outcomeMarks: 3,
  ruleMarks: 2,
  facts,
  outcomes,
});

const w = (
  id: string,
  part: "C" | "D",
  marks: number,
  prompt: string,
  hint?: string,
  rows = 6
): QuestionWritten => ({ id, part, marks, prompt, hint, rows });

/**
 * Part D is the one part with no alternative set in the printed retake.
 *
 * That is not an oversight in the paper: A, B and C turn on fact patterns, and
 * a retake needs different facts. Part D asks for professional conduct — the
 * $200 and the PTIN, the dependant found in March, Form 8867, the escalation
 * list — and there is no second set of right answers to hold in reserve. A
 * student re-sitting Part D answers these again, which is what sitting it on
 * paper would also mean.
 */
const PART_D: QuestionWritten[] = [
  w(
    "D1",
    "D",
    3,
    "A client offers you $200 in cash to prepare his return quickly and to leave your PTIN off it, “so it stays simple”. What is wrong with this, and what do you do?",
    undefined,
    7
  ),
  w(
    "D2",
    "D",
    3,
    "On 3 March you realise that a return you prepared and filed in February claimed a dependant who did not in fact live with the client for more than half the year. What do you do, and in what order?",
    "Order matters here.",
    7
  ),
  w(
    "D3",
    "D",
    3,
    "A returning client’s income is identical to last year’s, to the dollar, including the cash side income. She says nothing changed. What is your duty here, and what would you write down?",
    undefined,
    7
  ),
  w(
    "D4",
    "D",
    3,
    "Name the four items Form 8867 covers, and explain in one sentence why that matters in dollars.",
    undefined,
    6
  ),
  w(
    "D5",
    "D",
    3,
    "List the five things you do not handle alone in your first season.",
    undefined,
    6
  ),
];

/* ------------------------------------------------------------- PAPER A --- */

const PAPER_A: Paper = {
  id: "A",
  label: "Paper A",
  a: [
    a(
      "A1",
      "Dominique, 31, has never married. Her brother, 23, lived with her for the whole of 2026 while studying full time at Wayne State. She paid every cost of the household and he contributed nothing."
    ),
    a(
      "A2",
      "Tonya’s husband moved out on 6 March 2026 and has not been back. Their divorce was finalised on 2 January 2027. Their daughter lived with Tonya all year and Tonya paid every bill. She will file a separate return."
    ),
    a(
      "A3",
      "Bernard is unmarried and lives alone. He pays the entire rent and every bill on his mother’s apartment across town, where she lives by herself. He can claim her as a dependant."
    ),
    a(
      "A4",
      "Sharon’s husband works offshore. He was in the family home for two weeks over Christmas and at no other time in 2026. Their son lived with Sharon all year, she paid every cost, and she will file a separate return."
    ),
    a(
      "A5",
      "Priya is unmarried. Her boyfriend’s six-year-old daughter lived in Priya’s home for all of 2026 and Priya paid every cost of the household. The child is not related to Priya."
    ),
    a(
      "A6",
      "Curtis lived alone with his twelve-year-old son for the whole of 2026 and paid every bill. He married his long-term partner on 28 December 2026, and she moved in that day."
    ),
  ],
  b: [
    b(
      "B1",
      "Nadia is 27, unmarried, has no children, and earned $14,200 in wages in 2026. She has no other income.",
      [
        { id: "yes-no-children", label: "Yes — the credit for a filer with no children" },
        { id: "no-no-children", label: "No — she has no children" },
        { id: "no-income-low", label: "No — her income is too low to qualify" },
        { id: "yes-needs-child", label: "Yes, but only once she has a qualifying child" },
      ]
    ),
    b(
      "B2",
      "A client’s entire 2026 income was $21,000 of unemployment compensation. She has two children who lived with her all year.",
      [
        { id: "none", label: "No credit at all" },
        { id: "yes-two", label: "Yes, on two children" },
        { id: "yes-two-reduced", label: "Yes, on two children, but reduced" },
        { id: "no-too-high", label: "No — her income is too high" },
      ]
    ),
    b(
      "B3",
      "Darius has two qualifying children and $28,000 of wages. He also sold shares in 2026, producing $11,900 of capital gain, and received $550 of dividends.",
      [
        { id: "none-investment", label: "No credit — investment income of $12,450 is over the limit" },
        { id: "yes-two", label: "Yes, on two children" },
        { id: "yes-two-tapered", label: "Yes, on two children, tapered for the investment income" },
        { id: "none-gain-only", label: "No — the $11,900 capital gain on its own is over the limit" },
      ]
    ),
    b(
      "B4",
      "Renee’s daughter turned 20 in May 2026, lived at home all year and worked full time at a warehouse. She was not enrolled in education at any point. Renee earned $23,400.",
      [
        {
          id: "not-on-daughter",
          label:
            "Not on the daughter — though Renee may still qualify for the credit for a filer with no children",
        },
        { id: "yes-one", label: "Yes, on one child" },
        { id: "none", label: "No credit at all" },
        {
          id: "yes-one-lived-home",
          label: "Yes, on one child, because the daughter lived at home all year",
        },
      ]
    ),
    b(
      "B5",
      "A child lived with her grandmother for eight months of 2026 and with her mother for four. The grandmother earned $34,000; the mother earned $9,000 and is filing a return. Both want to claim the child.",
      [
        { id: "mother", label: "The mother claims — if she claims at all" },
        { id: "grandmother-months", label: "The grandmother claims — the child lived with her eight months" },
        { id: "grandmother-agi", label: "The grandmother claims — her income is higher" },
        { id: "split", label: "They may agree to split the credit between them" },
      ]
    ),
    b(
      "B6",
      "Elise reports $14,900 of cash income from braiding hair, three qualifying children, and no expenses at all. The figure lands close to where the credit peaks. She has kept an appointment book for the whole year but no receipts.",
      [
        {
          id: "ask-document-prepare",
          label:
            "Yes, on three children — ask, use the appointment book, reconstruct the expenses that plainly exist, document all of it, and prepare it",
        },
        { id: "as-reported", label: "Yes, on three children — prepare it as she reported it" },
        { id: "decline", label: "Decline the return" },
        { id: "no-cash", label: "No credit — cash income with no receipts cannot support a claim" },
      ]
    ),
  ],
  c: {
    heading: "Yvette Mercer",
    client:
      "Yvette Mercer, 29, unmarried, never married. Her son Kaiden, 5, lived with her for the whole of 2026. She paid every cost of the household. She rented a flat at 3820 Chene St, Detroit, for the whole of 2026 at $775 a month, all twelve payments made. Heat is included.",
    documents: [
      {
        doc: "Form W-2 — Great Lakes Retail Group",
        details:
          "Box 1 19,540.00 · Box 2 610.00 · Box 3 and 5 19,540.00 · Box 16 19,540.00 · Box 17 800.00 · Box 18 19,540.00 · Box 19 460.00 · Box 20 DETROIT",
      },
      {
        doc: "Form 1099-NEC — Halo Studio LLC",
        details:
          "Box 1, nonemployee compensation: 3,200.00. She rents a chair at a salon and styles hair on Saturdays.",
      },
      {
        doc: "Her own records",
        details:
          "Receipts for supplies totalling 640.00. A mileage log showing 900 business miles, salon to client homes. No other records.",
      },
    ],
    said:
      "“Kaiden’s been with me the whole time. His dad hasn’t claimed him before as far as I know. Nobody’s ever asked me about the rent.”",
    questions: [
      w("C1", "C", 3, "Filing status, and the test that decided it.", undefined, 5),
      w("C2", "C", 3, "Which returns does she need? Name the Detroit form and say why.", undefined, 5),
      w("C3", "C", 5, "The Schedule C. Show how you arrive at the net profit.", "Use the rate on your figures sheet, and say which rate you used.", 8),
      w("C4", "C", 4, "Which credits, and on how many children? State her earned income.", undefined, 6),
      w("C5", "C", 4, "What is she owed that she did not ask about, and roughly what is it based on?", undefined, 6),
      w("C6", "C", 6, "Write two file notes for this return.", "Date, what you asked, what they said, what you saw.", 10),
    ],
  },
  d: PART_D,
};

/* ------------------------------------------------------------- PAPER B --- */

const PAPER_B: Paper = {
  id: "B",
  label: "Paper B — retake",
  a: [
    a(
      "A1",
      "Marlon, 40, unmarried. His 15-year-old nephew lived with him from 1 February 2026 to the end of the year after the boy’s mother went into hospital. Marlon paid every cost."
    ),
    a(
      "A2",
      "Gail’s husband died on 19 May 2026. She has no children and did not remarry."
    ),
    a(
      "A3",
      "Devon and his wife separated on 30 June 2026 and she moved out that day. Their two children stayed with Devon and he paid every bill. He will file separately."
    ),
    a(
      "A4",
      "Rochelle, unmarried, supports her adult son who lives in his own apartment. She pays more than half his costs and can claim him as a dependant."
    ),
    a(
      "A5",
      "Anita married on 3 January 2027. Throughout 2026 she lived with her fiancé and her own 9-year-old daughter, and paid every cost of the home."
    ),
    a(
      "A6",
      "Terrence, unmarried, shares a flat with a friend. They split the rent and bills exactly in half. His 7-year-old son lives with them full time and Terrence pays everything for the boy."
    ),
  ],
  b: [
    b(
      "B1",
      "Kendra, 34, unmarried, no children, $21,400 of wages and no other income.",
      [
        { id: "no-ceiling", label: "No — she is above the ceiling for a filer with no children" },
        { id: "no-no-children", label: "No — she has no children" },
        { id: "yes-no-children", label: "Yes — the credit for a filer with no children" },
        { id: "no-investment", label: "No — her wages count as investment income at that level" },
      ]
    ),
    b(
      "B2",
      "Omar has one qualifying child and $4,100 of wages. He also received $16,000 in child support.",
      [
        { id: "yes-on-wages", label: "Yes, on one child — on the $4,100 only" },
        { id: "yes-on-all", label: "Yes, on one child — on $20,100" },
        { id: "no-too-low", label: "No — $4,100 is too little to qualify" },
        { id: "no-support", label: "No — the child support puts him over the limit" },
      ]
    ),
    b(
      "B3",
      "Latoya’s son, 17, lived with her all year, and also worked and filed a joint return with his wife purely to get back $180 of withheld tax.",
      [
        { id: "yes", label: "Yes — the joint return was filed only to reclaim withholding" },
        { id: "no-joint", label: "No — he filed a joint return, so the joint-return test fails" },
        { id: "no-married", label: "No — a married child can never be a qualifying child" },
        { id: "no-worked", label: "No — he worked, so he supported himself" },
      ]
    ),
    b(
      "B4",
      "Two unmarried parents; the child spent exactly 183 nights with each. The father earned $31,000 and the mother $29,500.",
      [
        { id: "father", label: "The father — the nights tie, so the higher AGI decides" },
        { id: "mother", label: "The mother — the lower income decides" },
        { id: "either", label: "Either may claim, as they agree between them" },
        { id: "neither", label: "Neither — the nights must be unequal for anyone to claim" },
      ]
    ),
    b(
      "B5",
      "Simone has two qualifying children, $26,000 of wages, and her younger child does not yet have a Social Security number — the application is pending.",
      [
        {
          id: "older-only",
          label: "Not on the younger child — a valid SSN is required. She may claim on the older child",
        },
        { id: "both", label: "Yes, on both children — the application is pending" },
        { id: "none", label: "No credit at all until the number arrives" },
        { id: "itin", label: "Yes, on both children, using an ITIN for the younger" },
      ]
    ),
    b(
      "B6",
      "A client reports a Schedule C loss of $3,400 from a resale business and $18,000 of wages, with two qualifying children.",
      [
        {
          id: "yes-reduced",
          label: "Yes, on two children — but earned income is $14,600, not the wages alone",
        },
        { id: "yes-wages", label: "Yes, on two children — on the $18,000 of wages" },
        { id: "no-loss", label: "No — a Schedule C loss disqualifies the credit" },
        { id: "yes-ignore-loss", label: "Yes, on two children — the loss is ignored for this credit" },
      ]
    ),
  ],
  c: {
    heading: "Andre Whitfield",
    client:
      "Andre Whitfield, 44, unmarried. His daughter Simone, 14, lived with him all year and he paid every cost. He owned and lived in a house at 16420 Lahser Rd, Detroit, for the whole of 2026; the 2026 property tax billed and paid was $1,640.",
    documents: [
      {
        doc: "Form W-2 — Midpoint Logistics Inc.",
        details:
          "Box 1 26,300.00 · Box 2 1,090.00 · Box 3 and 5 27,800.00 (Box 12a, code D, 1,500.00) · Box 16 26,300.00 · Box 17 1,080.00 · Box 18 26,300.00 · Box 19 620.00 · DETROIT",
      },
      {
        doc: "Form 1099-G",
        details: "Unemployment compensation 2,850.00, no federal tax withheld.",
      },
    ],
    said:
      "“I was laid off in January and back by March. The unemployment doesn’t count, does it?”",
    questions: [
      w("C1", "C", 3, "Filing status, and the test that decided it.", undefined, 5),
      w("C2", "C", 3, "Which returns does he need? Name the Detroit form and say why.", undefined, 5),
      w(
        "C3",
        "C",
        5,
        "The unemployment compensation. Does it go on the return, and what does it do to the Earned Income Tax Credit?",
        "His question at intake is the question. Answer both halves.",
        8
      ),
      w(
        "C4",
        "C",
        4,
        "Box 1 and Boxes 3 and 5 do not match. Explain the difference in the words you would use with him, and say what it means for what he owes.",
        undefined,
        7
      ),
      w("C5", "C", 4, "What is he owed that he did not ask about, and roughly what is it based on?", undefined, 6),
      w("C6", "C", 6, "Write two file notes for this return.", "Date, what you asked, what they said, what you saw.", 10),
    ],
  },
  d: PART_D,
};

export const PAPERS: Record<PaperId, Paper> = { A: PAPER_A, B: PAPER_B };

export function paper(id: PaperId): Paper {
  return PAPERS[id];
}

/** Every question id in a paper, part by part. */
export function questionIds(id: PaperId, part: ExamPart): string[] {
  const p = paper(id);
  if (part === "A") return p.a.map((q) => q.id);
  if (part === "B") return p.b.map((q) => q.id);
  if (part === "C") return p.c.questions.map((q) => q.id);
  return p.d.map((q) => q.id);
}

/** Marks available for one question, by part and id. */
export function marksFor(id: PaperId, part: ExamPart, qid: string): number {
  const p = paper(id);
  const pool =
    part === "A"
      ? p.a
      : part === "B"
        ? p.b
        : part === "C"
          ? p.c.questions
          : p.d;
  return pool.find((q) => q.id === qid)?.marks ?? 0;
}

/**
 * What the student's browser is allowed to see.
 *
 * Only the parts this sitting covers, and only the question text and the
 * choices. There is nothing to strip here because this file never had an
 * answer in it — which is the point of the split.
 */
export function paperForStudent(id: PaperId, parts: ExamPart[]) {
  const p = paper(id);
  return {
    id: p.id,
    label: p.label,
    parts: parts.map((part) => PART_SPECS[part]),
    a: parts.includes("A") ? p.a : [],
    b: parts.includes("B") ? p.b : [],
    c: parts.includes("C") ? p.c : null,
    d: parts.includes("D") ? p.d : [],
    statuses: FILING_STATUSES,
    tests: DECIDING_TESTS,
    rules: EITC_RULES,
  };
}

export type StudentPaper = ReturnType<typeof paperForStudent>;
