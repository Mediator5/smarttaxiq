/**
 * The answer key.
 *
 * SERVER ONLY. Nothing in this file may be imported by a client component or
 * passed as a prop to one — props are serialised into the HTML, so a single
 * careless import would publish the whole key to anyone who views source
 * mid-sitting. Marking happens in route handlers and in the instructor's
 * server-rendered marking screen, and what reaches the browser is a mark out
 * of five, never the answer that produced it.
 *
 * Transcribed from final-exam-key.pdf: the Paper A key, the marking
 * principles, the Part C automatic deductions, and the Paper B answers from
 * the retake section. `notes` carries the marker's own commentary, which the
 * instructor sees beside each question and the student never does.
 */

import type { ExamPart, PaperId } from "./exam";

/* ----------------------------------------------------- marking principles */

export const MARKING_PRINCIPLES: string[] = [
  "Every part must pass on its own. 92% overall with 67% on Part A is a fail, and the retake is of the failed parts, not the whole paper.",
  "Naming the test is worth marks even when the status is wrong. A student who reasons correctly on the wrong facts has shown something; a bare status with nothing behind it has shown nothing.",
  "“I would ask…” is a correct answer wherever the fact pattern genuinely does not settle it. Reward it.",
  "Do not award marks for a number invented to fill a gap. In Part C this is an automatic zero on that sub-question, whatever else is on the page.",
];

/** Part C only, and absolute. These override anything else on the page. */
export const PART_C_DEDUCTIONS: string[] = [
  "A mileage figure other than the one in the log, with no basis: zero on the Schedule C question.",
  "Earned income stated as the W-2 alone: zero on the credits question.",
  "A file note with no date: zero for that note.",
  "A promised refund date anywhere on the paper: flag it and raise it in the debrief. A return claiming the EITC is held by law.",
];

/* ---------------------------------------------------------- the key shapes */

/** Part A. `statuses` and `tests` are sets of acceptable ids, not single
 *  answers — A6 on Paper A is right either way round, and more than one of the
 *  named tests can be the honest answer to the same question. */
export type KeyA = { statuses: string[]; tests: string[]; note: string };

export type KeyB = { outcome: string; rules: string[]; note: string };

/** Written questions. `answer` is the model answer; `awards` is how the five
 *  or six marks break down. Both are shown to the instructor while marking. */
export type KeyWritten = { answer: string; awards: string };

export type PaperKey = {
  a: Record<string, KeyA>;
  b: Record<string, KeyB>;
  c: Record<string, KeyWritten>;
  d: Record<string, KeyWritten>;
};

/* ------------------------------------------------------- PAPER A · KEY --- */

const KEY_A: PaperKey = {
  a: {
    A1: {
      statuses: ["hoh"],
      tests: ["test3", "student-exception"],
      note: "Head of Household. Tests 1 and 2 are straightforward. Test 3 is the work: a sibling satisfies the relationship test, and at 23 he passes the age test as a full-time student under 24 who is younger than she is. Award the 2 test marks only if the answer reaches the student exception. “Because she paid everything” scores 3 of 5.",
    },
    A2: {
      statuses: ["hoh"],
      tests: ["considered-unmarried"],
      note: "Head of Household. Still married on 31 December — the divorce landed two days into 2027 — so she needs considered unmarried, and she meets it: separate return, paid more than half, spouse out since 6 March and so absent for the whole of the last six months, the home was her daughter’s main home, and she can claim her. The positive case of the rule that catches everyone out in the negative.",
    },
    A3: {
      statuses: ["hoh"],
      tests: ["dependent-parent"],
      note: "Head of Household, on the dependent-parent exception. A parent is a qualifying person even though she does not live with him, because he pays more than half the cost of keeping up her home and can claim her. That nobody lives with Bernard is irrelevant. Expect this to be the lowest-scoring question on Part A.",
    },
    A4: {
      statuses: ["mfs"],
      tests: ["considered-unmarried"],
      note: "Married Filing Separately. Married on 31 December, so she needs considered unmarried — and the test is that the spouse did not live in the home at any point during the last six months. Two weeks at Christmas is a point during the last six months. It fails. “He was hardly ever there” has missed the whole question.",
    },
    A5: {
      statuses: ["single"],
      tests: ["test3", "relationship-test"],
      note: "Single. Tests 1 and 2 pass comfortably; test 3 fails, because a qualifying person must be a relative and the boyfriend’s daughter is not related to Priya. Someone who qualifies only by living in the home never makes your client Head of Household, however much they paid. She may be able to claim the child as a dependant — a bonus note, not a mark.",
    },
    A6: {
      statuses: ["mfj", "mfs"],
      tests: ["dec31"],
      note: "Married, jointly or separately — either is accepted. Marital status is decided on 31 December, so marrying on the 28th makes him married for the entire year. Head of Household is not available: he is married and his wife lived in the home during the last six months.",
    },
  },
  b: {
    B1: {
      outcome: "yes-no-children",
      rules: ["ceiling"],
      note: "Yes — the no-children credit. $14,200 of wages is earned income and sits under the no-children ceiling of $19,540. Full marks need the ceiling checked rather than assumed. “No, she has no children” misses that the credit exists without children at all — a common and expensive gap. Marker’s note: the childless credit also carries its own minimum and maximum age condition, which the modules do not teach. Confirm it before marking and do not penalise a student for not raising it.",
    },
    B2: {
      outcome: "none",
      rules: ["earned-income"],
      note: "No credit at all. Unemployment compensation is not earned income. She has two qualifying children and no earned income, so there is nothing. The rule mark is for “no earned income”, not “her income is too low”. Bonus note if the student says this is a conversation to have at the desk rather than leave to an IRS letter.",
    },
    B3: {
      outcome: "none-investment",
      rules: ["investment-limit"],
      note: "No credit. A deliberate near-miss: investment income is $11,900 + $550 = $12,450, over the $12,200 limit, so the credit is gone entirely — two qualifying children notwithstanding. A student who reads only the capital gain and answers “yes, on two” has failed to add the dividends. Full marks require the $12,450 total and the point that there is no tapering.",
    },
    B4: {
      outcome: "not-on-daughter",
      rules: ["age-test"],
      note: "Not on the daughter. She is 20, not under 19, and was not a student at any point, so the age test fails and she is not a qualifying child. Renee may still qualify for the no-children credit if her own circumstances fit. Full marks for naming the age test and for not stopping at “no”.",
    },
    B5: {
      outcome: "mother",
      rules: ["tiebreaker-parent"],
      note: "The mother claims, if she claims at all. Rule 1: a parent beats a non-parent, regardless of nights or income — the eight months with the grandmother do not change that. But if the mother does not claim, the grandmother may, because her AGI of $34,000 exceeds the mother’s $9,000 (rule 4). Full marks require both halves. Jumping to nights or to income applies the rules out of order, which is the single most common EITC error there is.",
    },
    B6: {
      outcome: "ask-document-prepare",
      rules: ["due-diligence"],
      note: "Ask, document, and most likely prepare. The pattern is the Module 3 warning sign — cash income, no expenses, landing at the peak — so the duty to make reasonable inquiries is engaged. But unlike the Module 3 scenario she has a full year’s appointment book, which is real contemporaneous evidence. Ask how many clients, how often, what she buys, how she travels; use the book; reconstruct the expenses that plainly exist; document it; prepare it if the answers hold together. Declining outright has over-learned Module 3; preparing it with zero expenses and no questions has learned nothing.",
    },
  },
  c: {
    C1: {
      answer: "Head of Household. Unmarried, paid more than half the cost of keeping up the home, and Kaiden lived with her all year.",
      awards: "2 for the status, 1 for naming which test she satisfies.",
    },
    C2: {
      answer: "Federal 1040, MI-1040, and Detroit Form 5118.",
      awards:
        "1 mark each. The third mark needs “because she was a Detroit resident all year”, not “because Box 20 says Detroit”.",
    },
    C3: {
      answer:
        "Gross receipts 3,200.00, less receipted supplies 640.00, less 900 business miles at the standard rate on the figures sheet. At an illustrative $0.70 a mile the net profit is about $1,930 — substitute the confirmed rate.",
      awards:
        "3 for the method (gross receipts, receipted supplies, mileage at the standard rate). 1 for using the figures-sheet rate rather than a remembered one. 1 for noting that self-employment tax applies, with half deductible as an adjustment.",
    },
    C4: {
      answer:
        "EITC on one child, and the Child Tax Credit on Kaiden. Earned income is wages plus Schedule C net profit — roughly $21,470 on the illustration.",
      awards:
        "2 for the credits. 2 for earned income being wages plus net profit; a student who uses the W-2 alone loses both.",
    },
    C5: {
      answer:
        "The Homestead Property Tax Credit. She rents, and renters qualify — $9,300 of rent for the year, a portion of which is treated as property tax.",
      awards:
        "3 marks for finding it, 1 for the basis. This is the question that separates the cohort. Her own words were “nobody’s ever asked me about the rent”.",
    },
    C6: {
      answer:
        "The obvious two: Kaiden’s residency (asked how many months — client said all twelve — saw school registration), and whether anyone else has claimed him, which she raised herself at intake and which nobody followed up.",
      awards:
        "3 marks each, and only when all four elements are there: date, what you asked, what they said, what you saw.",
    },
  },
  d: {
    D1: {
      answer:
        "Refuse. Anyone who prepares a return for compensation must have a PTIN on it; leaving it off is exactly what a ghost preparer does, and it is not a favour to the client, because it leaves them with no signed preparer if anything goes wrong. Prepare it properly with the PTIN on it if he still wants it, and report the conversation to the trainer.",
      awards: "1 for the refusal, 1 for the PTIN rule, 1 for telling the trainer.",
    },
    D2: {
      answer:
        "Tell the trainer first, then the client, then correct it. Order matters and is the point of the question. A filed prior return is on the escalation list, so the student does not handle the amendment alone. What they must not do is nothing, and what they must not do is contact the client with an improvised explanation first.",
      awards:
        "1 for raising it immediately, 1 for escalating rather than fixing it alone, 1 for documenting what was found and when.",
    },
    D3: {
      answer:
        "Inquire, and record the inquiry. Duty 3 — knowledge. Identical cash income two years running is inconsistent with how cash income actually behaves, so the duty to make reasonable inquiries is engaged. The answer must contain an actual question the student would ask, and a note recording what they asked and what she said.",
      awards: "1 for identifying the duty, 1 for a real question, 1 for the note.",
    },
    D4: {
      answer:
        "EITC · CTC/ACTC/ODC · AOTC · Head of Household. It matters because the due-diligence penalty applies separately to each, so a single return can carry four of them, and the firm can be assessed as well.",
      awards:
        "2 marks for all four, 1 for three. The final mark is for the reason. Do not require a dollar figure — we deliberately do not teach one. “Look up the current amount” has understood the course.",
    },
    D5: {
      answer:
        "IRS notices · identity theft · unfiled prior years · companies and partnerships · anything you are unsure about.",
      awards:
        "3 marks for all five, 2 for four, 1 for three. The fifth is the one that matters most and the one most often left off.",
    },
  },
};

/* ------------------------------------------------------- PAPER B · KEY --- */

const KEY_B: PaperKey = {
  a: {
    A1: {
      statuses: ["hoh"],
      tests: ["test3", "relationship-test"],
      note: "Head of Household. A nephew is a descendant of a sibling, so the relationship works, and eleven months is more than half the year. Test 3.",
    },
    A2: {
      statuses: ["mfj"],
      tests: ["year-of-death", "qss-needs-child"],
      note: "Married Filing Jointly for 2026 — the year of death. Qualifying Surviving Spouse is not available to her in any year, because she has no dependent child. Escalate if the student is unsure; this is a legitimate “ask the trainer”.",
    },
    A3: {
      statuses: ["mfs"],
      tests: ["considered-unmarried"],
      note: "Married Filing Separately. She lived in the home on 30 June, which falls in the last six months of the year. One day inside the window is enough. The six-month rule.",
    },
    A4: {
      statuses: ["single"],
      tests: ["test3"],
      note: "Single. The dependent-parent exception applies only to a parent; any other qualifying person must have lived with the client for more than half the year. Test 3. A student who reaches for the dependent-parent exception here has made the mistake the question is built to catch.",
    },
    A5: {
      statuses: ["hoh"],
      tests: ["dec31"],
      note: "Head of Household. She was unmarried on 31 December 2026; the January wedding is next year’s problem. Her daughter is a qualifying person. The 31 December rule.",
    },
    A6: {
      statuses: ["single"],
      tests: ["test2"],
      note: "Single. Test 2 fails — he paid exactly half the cost of keeping up the home, not more than half. The child does not rescue it. This question separates students who check all three tests from students who stop at the child.",
    },
  },
  b: {
    B1: {
      outcome: "no-ceiling",
      rules: ["ceiling"],
      note: "No. The no-children ceiling is $19,540 for a single filer and she is above it. Full marks require the ceiling to have been looked up rather than guessed. “No, she has no children” is the right answer for the wrong reason — 2 of 5 on paper; online it scores the outcome marks and loses the rule marks, which is the same thing.",
    },
    B2: {
      outcome: "yes-on-wages",
      rules: ["earned-income"],
      note: "Yes, on one child — on the $4,100 only. Child support is not earned income and not income at all. The credit will be small; that is the correct answer.",
    },
    B3: {
      outcome: "yes",
      rules: ["joint-return-test"],
      note: "Yes. The joint-return test is not failed where the joint return was filed only to claim back withholding. The J in R-A-R-J.",
    },
    B4: {
      outcome: "father",
      rules: ["tiebreaker-agi"],
      note: "The father. Both are parents and the nights are equal, so rule 3 applies and the higher AGI wins. Full marks require the student to reach income only after establishing that the nights tie.",
    },
    B5: {
      outcome: "older-only",
      rules: ["ssn"],
      note: "Not on that child — a valid SSN is required. She may claim on the older child. The correct practical answer also includes asking when the number is expected and whether the return should wait.",
    },
    B6: {
      outcome: "yes-reduced",
      rules: ["schedule-c-loss", "earned-income"],
      note: "Yes, on two children — but earned income is $18,000 less the $3,400 loss, not the wages alone. The loss reduces earned income. Most students miss this.",
    },
  },
  c: {
    C1: {
      answer: "Head of Household. Unmarried, paid more than half the cost, and Simone lived with him all year.",
      awards: "2 for the status, 1 for naming which test he satisfies.",
    },
    C2: {
      answer: "Federal 1040, MI-1040, and Detroit Form 5118.",
      awards: "1 mark each, the third for naming him a Detroit resident all year.",
    },
    C3: {
      answer:
        "Yes — the unemployment is fully taxable and goes on the return. But it is not earned income, so it does not increase the EITC. His question at intake is the question.",
      awards:
        "Up to 3 for the unemployment being taxable and on the return, and 2 more for saying it is not earned income. Both halves are needed for full marks.",
    },
    C4: {
      answer:
        "Box 1 and Boxes 3 and 5 differ by the $1,500 retirement deferral in Box 12a, code D — money he put into a retirement plan, which comes out of taxable wages but not out of Social Security and Medicare wages. He will also very likely owe, or get less than he expects, because nothing was withheld on the unemployment.",
      awards:
        "3 marks for explaining the deferral in client language. 1 for warning him about the balance and raising withholding for next year.",
    },
    C5: {
      answer:
        "The Homestead Property Tax Credit, as an owner this time — $1,640 of property tax billed and paid on the home he lived in all year.",
      awards: "3 marks for finding it, 1 for the basis.",
    },
    C6: {
      answer:
        "The obvious two: Simone’s residency, and the unemployment — what he was asked, what he said about January to March, and what the 1099-G showed.",
      awards:
        "3 marks each, on the same four-element standard: date, what you asked, what they said, what you saw.",
    },
  },
  d: KEY_A.d,
};

export const KEYS: Record<PaperId, PaperKey> = { A: KEY_A, B: KEY_B };

/** The key for one question, whatever part it is in. */
export function keyFor(paperId: PaperId, part: ExamPart, qid: string) {
  const k = KEYS[paperId];
  if (part === "A") return k.a[qid] ?? null;
  if (part === "B") return k.b[qid] ?? null;
  if (part === "C") return k.c[qid] ?? null;
  return k.d[qid] ?? null;
}
