/**
 * Marking, timing and standing for the final exam.
 *
 * Pure functions over the paper, the key and an attempt row. No database and
 * no request here, so the two things that must not be got wrong — the clock
 * and the four pass bars — can be reasoned about in one place.
 *
 * This module imports the key, so it is server-only. Nothing here may be
 * reached from a client component.
 */

import {
  ALL_PARTS,
  PART_SPECS,
  marksFor,
  paper,
  questionIds,
  type ExamPart,
  type PaperId,
} from "@/content/academy/exam";
import { KEYS } from "@/content/academy/exam-key";

/* ------------------------------------------------------------- answers --- */

export type AnswerA = { status?: string; test?: string };
export type AnswerB = { outcome?: string; rule?: string };
export type AnswerWritten = { text?: string };
export type Answer = AnswerA & AnswerB & AnswerWritten;
export type AnswerSheet = Record<string, Answer>;

export type MarkSheet = Record<string, number>;

/* --------------------------------------------------------------- the clock */

/**
 * How long is left, from the server's own clock and the row's own expiry.
 *
 * Never computed from anything the browser sent. `expires_at` is written once
 * when the paper is opened and is never moved, so this is the same answer
 * whether it is asked once or a hundred times, from a laptop or a phone.
 */
export function remainingMs(expiresAt: string, now = Date.now()): number {
  return Math.max(0, new Date(expiresAt).getTime() - now);
}

/**
 * A few seconds of slack on the deadline.
 *
 * A save that left the browser at 1:59:58 and arrives at 2:00:01 is a save
 * the student made in time, and refusing it would lose an answer they wrote
 * inside the two hours. Three seconds is long enough to cover the round trip
 * and far too short to be worth gaming.
 */
export const SUBMIT_GRACE_MS = 3_000;

export function expired(expiresAt: string, now = Date.now()): boolean {
  return now > new Date(expiresAt).getTime() + SUBMIT_GRACE_MS;
}

/* -------------------------------------------------------------- marking --- */

/**
 * Mark Parts A and B against the key.
 *
 * Both parts split five marks the way the printed paper splits them: three
 * for the answer, two for naming the test or rule that got you there. That
 * split is what makes "right answer, wrong reason" score 3 of 5 online and on
 * paper alike — see the Paper B B1 marker's note, which says so explicitly.
 *
 * Parts C and D are not marked here and never will be. They return no marks
 * at all rather than zero, so that an unmarked written part can never be
 * mistaken for a failed one.
 */
export function markAuto(
  paperId: PaperId,
  parts: ExamPart[],
  answers: AnswerSheet
): MarkSheet {
  const p = paper(paperId);
  const key = KEYS[paperId];
  const out: MarkSheet = {};

  if (parts.includes("A")) {
    for (const q of p.a) {
      const given = answers[q.id] ?? {};
      const k = key.a[q.id];
      if (!k) continue;
      let mark = 0;
      if (given.status && k.statuses.includes(given.status)) mark += q.statusMarks;
      if (given.test && k.tests.includes(given.test)) mark += q.testMarks;
      out[q.id] = mark;
    }
  }

  if (parts.includes("B")) {
    for (const q of p.b) {
      const given = answers[q.id] ?? {};
      const k = key.b[q.id];
      if (!k) continue;
      let mark = 0;
      if (given.outcome && given.outcome === k.outcome) mark += q.outcomeMarks;
      if (given.rule && k.rules.includes(given.rule)) mark += q.ruleMarks;
      out[q.id] = mark;
    }
  }

  return out;
}

/** Which parts of this sitting a human still has to mark. */
export function partsAwaitingMarking(
  parts: ExamPart[],
  marks: MarkSheet | null
): ExamPart[] {
  return parts.filter((part) => {
    if (PART_SPECS[part].howMarked === "auto") return false;
    return !marks || Object.keys(marks).length === 0;
  });
}

export type PartTotal = {
  part: ExamPart;
  awarded: number;
  available: number;
  needed: number;
  passPct: number;
  passed: boolean;
  /** False until every question in the part carries a mark. */
  marked: boolean;
};

/**
 * Add up one sitting, part by part.
 *
 * A part is only `marked` when every question in it has a number against it.
 * Until then `passed` is false and means nothing — the caller must look at
 * `marked` first. This is the guard that stops a half-marked Part C from
 * reading as a fail and minting a retake.
 */
export function partTotals(
  paperId: PaperId,
  parts: ExamPart[],
  autoMarks: MarkSheet | null,
  instructorMarks: MarkSheet | null
): PartTotal[] {
  return parts.map((part) => {
    const spec = PART_SPECS[part];
    const ids = questionIds(paperId, part);
    const source = spec.howMarked === "auto" ? autoMarks : instructorMarks;

    let awarded = 0;
    let marked = true;
    for (const qid of ids) {
      const given = source?.[qid];
      if (typeof given !== "number") {
        marked = false;
        continue;
      }
      // Never credit more than the question carries, whatever is in the row.
      awarded += Math.max(0, Math.min(marksFor(paperId, part, qid), given));
    }

    return {
      part,
      awarded,
      available: spec.marks,
      needed: spec.needed,
      passPct: spec.passPct,
      passed: marked && awarded >= spec.needed,
      marked,
    };
  });
}

/* ------------------------------------------------------------- standing --- */

export type AttemptLike = {
  paper: PaperId;
  parts: ExamPart[];
  auto_marks: MarkSheet | null;
  marks: MarkSheet | null;
  submitted_at: string | null;
};

export type PartStanding = {
  part: ExamPart;
  /** The best this student has done on this part, across every sitting. */
  best: PartTotal | null;
  passed: boolean;
  awaitingMarking: boolean;
};

export type Standing = {
  parts: PartStanding[];
  /** All four parts passed. The only thing that earns a certificate. */
  passed: boolean;
  /** Parts not yet passed, which is what a retake would cover. */
  failedParts: ExamPart[];
  /** Something is sat but not marked, so no verdict yet. */
  awaitingMarking: boolean;
};

/**
 * Where a student stands overall, across every sitting they have had.
 *
 * A retake covers only the parts that were failed, so a pass is assembled from
 * more than one sitting: Parts A, B and D from December and Part C from the
 * retake in January is a pass, and has to be read as one. Each part is taken
 * at its best across all submitted attempts, which is also the kinder reading
 * where a student re-sat a part they had already passed.
 */
export function standing(attempts: AttemptLike[]): Standing {
  const best = new Map<ExamPart, PartTotal>();
  let awaiting = false;

  for (const attempt of attempts) {
    if (!attempt.submitted_at) continue;
    const totals = partTotals(
      attempt.paper,
      attempt.parts,
      attempt.auto_marks,
      attempt.marks
    );
    for (const total of totals) {
      if (!total.marked) {
        awaiting = true;
        continue;
      }
      const held = best.get(total.part);
      if (!held || total.awarded > held.awarded) best.set(total.part, total);
    }
  }

  const parts: PartStanding[] = ALL_PARTS.map((part) => {
    const held = best.get(part) ?? null;
    return {
      part,
      best: held,
      passed: Boolean(held?.passed),
      awaitingMarking: !held && awaiting,
    };
  });

  const failedParts = parts.filter((p) => !p.passed).map((p) => p.part);

  return {
    parts,
    passed: failedParts.length === 0,
    failedParts,
    awaitingMarking: awaiting,
  };
}

/**
 * The verdict on one sitting, for the student's own result page.
 *
 * Null while anything in it is unmarked. "retake" names the parts to re-sit,
 * which is the paper's rule: only the parts that were failed.
 */
export function verdict(
  paperId: PaperId,
  parts: ExamPart[],
  autoMarks: MarkSheet | null,
  instructorMarks: MarkSheet | null
): { result: "pass" | "retake"; failedParts: ExamPart[] } | null {
  const totals = partTotals(paperId, parts, autoMarks, instructorMarks);
  if (totals.some((t) => !t.marked)) return null;
  const failed = totals.filter((t) => !t.passed).map((t) => t.part);
  return { result: failed.length ? "retake" : "pass", failedParts: failed };
}

/* ---------------------------------------------------------------- totals -- */

export function overallAwarded(totals: PartTotal[]) {
  return totals.reduce((n, t) => n + t.awarded, 0);
}

export function overallAvailable(totals: PartTotal[]) {
  return totals.reduce((n, t) => n + t.available, 0);
}

/** "A, B and D" — for the sentence that tells a student what to re-sit. */
export function listParts(parts: ExamPart[]): string {
  if (parts.length === 0) return "";
  if (parts.length === 1) return `Part ${parts[0]}`;
  const last = parts[parts.length - 1];
  return `Parts ${parts.slice(0, -1).join(", ")} and ${last}`;
}
