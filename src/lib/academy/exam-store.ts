import crypto from "crypto";
import { academyDb, normalizeEmail, type Student } from "./store";
import {
  ALL_PARTS,
  EXAM_MINUTES,
  RETAKE_WAIT_DAYS,
  type ExamPart,
  type PaperId,
} from "@/content/academy/exam";
import {
  expired,
  markAuto,
  partTotals,
  standing,
  verdict,
  type AnswerSheet,
  type MarkSheet,
} from "./exam";

/**
 * Every database call the final exam makes.
 *
 * Same posture as the rest of the Academy: one server-side client borrowed
 * from store.ts, RLS on with no policies, nothing reachable from a browser.
 * Env-gated the same way too — with Supabase unset every function here
 * returns null or an empty list and the exam pages render a "not configured"
 * state rather than a stack trace.
 */

/* ----------------------------------------------------------------- types -- */

export type ExamRelease = {
  id: string;
  student_id: string;
  paper: PaperId;
  parts: ExamPart[];
  released_by: string;
  released_at: string;
  note: string | null;
  attempt_id: string | null;
  revoked_at: string | null;
  revoked_by: string | null;
};

export type ExamAttempt = {
  id: string;
  student_id: string;
  release_id: string | null;
  paper: PaperId;
  parts: ExamPart[];
  started_at: string;
  duration_minutes: number;
  expires_at: string;
  answers: AnswerSheet;
  submitted_at: string | null;
  submitted_reason: "student" | "time" | null;
  auto_marks: MarkSheet | null;
  marks: MarkSheet | null;
  part_totals: unknown;
  failed_parts: ExamPart[] | null;
  result: "pass" | "retake" | null;
  marker_notes: string | null;
  marked_by: string | null;
  marked_at: string | null;
  created_at: string;
};

export type Certification = {
  student_id: string;
  route: "online" | "paper";
  attempt_id: string | null;
  paper: string | null;
  part_totals: unknown;
  certificate_no: string;
  passed_at: string;
  recorded_by: string;
  revoked_at: string | null;
  revoked_by: string | null;
};

export type ExamFile = {
  id: string;
  attempt_id: string;
  question_id: string | null;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  uploaded_at: string;
  deleted_at: string | null;
  deleted_by: string | null;
};

const RELEASE_COLS =
  "id, student_id, paper, parts, released_by, released_at, note, attempt_id, revoked_at, revoked_by" as const;

const ATTEMPT_COLS =
  "id, student_id, release_id, paper, parts, started_at, duration_minutes, expires_at, answers, submitted_at, submitted_reason, auto_marks, marks, part_totals, failed_parts, result, marker_notes, marked_by, marked_at, created_at" as const;

const CERT_COLS =
  "student_id, route, attempt_id, paper, part_totals, certificate_no, passed_at, recorded_by, revoked_at, revoked_by" as const;

const FILE_COLS =
  "id, attempt_id, question_id, file_name, mime_type, size_bytes, uploaded_at, deleted_at, deleted_by" as const;

export const EXAM_BUCKET = "exam-uploads";

/* -------------------------------------------------------------- releases -- */

/** The one release a student may be holding, or null. */
export async function openRelease(
  studentId: string
): Promise<ExamRelease | null> {
  const supabase = academyDb();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("academy_exam_releases")
    .select(RELEASE_COLS)
    .eq("student_id", studentId)
    .is("attempt_id", null)
    .is("revoked_at", null)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as ExamRelease) ?? null;
}

export async function releasesFor(studentId: string): Promise<ExamRelease[]> {
  const supabase = academyDb();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("academy_exam_releases")
    .select(RELEASE_COLS)
    .eq("student_id", studentId)
    .order("released_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as ExamRelease[];
}

/**
 * Let somebody sit the exam.
 *
 * The caller decides which paper and which parts; this enforces only that a
 * student is not holding two. Re-releasing while one is open replaces it, so
 * a mis-typed release is corrected by issuing the right one rather than by
 * hunting for a revoke button.
 */
export async function createRelease(input: {
  studentId: string;
  paper: PaperId;
  parts: ExamPart[];
  by: string;
  note?: string | null;
}): Promise<ExamRelease | null> {
  const supabase = academyDb();
  if (!supabase) return null;

  const parts = ALL_PARTS.filter((p) => input.parts.includes(p));
  if (parts.length === 0) throw new Error("A release needs at least one part.");

  const held = await openRelease(input.studentId);
  if (held) {
    await supabase
      .from("academy_exam_releases")
      .update({
        revoked_at: new Date().toISOString(),
        revoked_by: input.by.slice(0, 120),
      })
      .eq("id", held.id);
  }

  const { data, error } = await supabase
    .from("academy_exam_releases")
    .insert({
      student_id: input.studentId,
      paper: input.paper,
      parts,
      released_by: input.by.slice(0, 120),
      note: input.note?.trim().slice(0, 500) || null,
    })
    .select(RELEASE_COLS)
    .single();

  if (error) throw new Error(error.message);
  return data as ExamRelease;
}

export async function revokeRelease(id: string, by: string) {
  const supabase = academyDb();
  if (!supabase) return;

  const { error } = await supabase
    .from("academy_exam_releases")
    .update({ revoked_at: new Date().toISOString(), revoked_by: by.slice(0, 120) })
    .eq("id", id)
    .is("attempt_id", null);

  if (error) throw new Error(error.message);
}

/* -------------------------------------------------------------- attempts -- */

export async function liveAttempt(
  studentId: string
): Promise<ExamAttempt | null> {
  const supabase = academyDb();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("academy_exam_attempts")
    .select(ATTEMPT_COLS)
    .eq("student_id", studentId)
    .is("submitted_at", null)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as ExamAttempt) ?? null;
}

export async function attemptById(id: string): Promise<ExamAttempt | null> {
  const supabase = academyDb();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("academy_exam_attempts")
    .select(ATTEMPT_COLS)
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as ExamAttempt) ?? null;
}

export async function attemptsFor(studentId: string): Promise<ExamAttempt[]> {
  const supabase = academyDb();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("academy_exam_attempts")
    .select(ATTEMPT_COLS)
    .eq("student_id", studentId)
    .order("started_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as ExamAttempt[];
}

export type StartResult =
  | { ok: true; attempt: ExamAttempt; resumed: boolean }
  | {
      ok: false;
      reason: "not-configured" | "no-release" | "taken" | "too-soon";
      waitUntil?: string;
    };

/**
 * Open the paper, or hand back the one already open.
 *
 * The clock starts here and nowhere else. `expires_at` is computed from the
 * server's own now and stored, so every later request — save, submit, a
 * reload on a different device — reads the same deadline rather than
 * recomputing one from whatever the browser believes the time to be.
 *
 * Resuming is the common case and must be cheap: a student whose laptop died
 * signs back in, this returns their live attempt with the clock where it
 * genuinely is, and they carry on.
 *
 * Claiming the release is the lock. The attempt id is generated here and
 * written onto the release with `attempt_id is null` in the where clause, so
 * two tabs racing to open the same release produce one sitting, not two.
 */
export async function startAttempt(studentId: string): Promise<StartResult> {
  const supabase = academyDb();
  if (!supabase) return { ok: false, reason: "not-configured" };

  const live = await liveAttempt(studentId);
  if (live) {
    if (expired(live.expires_at)) {
      const closed = await finalizeAttempt(live.id, "time");
      return closed
        ? { ok: true, attempt: closed, resumed: true }
        : { ok: false, reason: "taken" };
    }
    return { ok: true, attempt: live, resumed: true };
  }

  const release = await openRelease(studentId);
  if (!release) return { ok: false, reason: "no-release" };

  // Seven days between a sitting and its retake, as the printed key requires.
  //
  // Only on Paper B, which is the retake. Re-releasing Paper A is a deliberate
  // act by an instructor — the usual reason is a sitting that went wrong in
  // the first ten minutes — and making her wait a week to undo her own
  // decision would be the rule working against the person it exists to serve.
  const previous = await attemptsFor(studentId);
  const lastSubmitted = previous
    .filter((a) => a.submitted_at)
    .sort((x, y) => (x.submitted_at! < y.submitted_at! ? 1 : -1))[0];

  if (release.paper === "B" && lastSubmitted?.submitted_at) {
    const waitUntil =
      new Date(lastSubmitted.submitted_at).getTime() +
      RETAKE_WAIT_DAYS * 24 * 60 * 60 * 1000;
    if (Date.now() < waitUntil) {
      return {
        ok: false,
        reason: "too-soon",
        waitUntil: new Date(waitUntil).toISOString(),
      };
    }
  }

  const attemptId = crypto.randomUUID();
  const claimed = await supabase
    .from("academy_exam_releases")
    .update({ attempt_id: attemptId })
    .eq("id", release.id)
    .is("attempt_id", null)
    .is("revoked_at", null)
    .select("id")
    .maybeSingle();

  if (claimed.error) throw new Error(claimed.error.message);
  if (!claimed.data) return { ok: false, reason: "taken" };

  const startedAt = new Date();
  const expiresAt = new Date(startedAt.getTime() + EXAM_MINUTES * 60 * 1000);

  const { data, error } = await supabase
    .from("academy_exam_attempts")
    .insert({
      id: attemptId,
      student_id: studentId,
      release_id: release.id,
      paper: release.paper,
      parts: release.parts,
      started_at: startedAt.toISOString(),
      duration_minutes: EXAM_MINUTES,
      expires_at: expiresAt.toISOString(),
      answers: {},
    })
    .select(ATTEMPT_COLS)
    .single();

  if (error) {
    // Hand the release back rather than burning it on a sitting that never
    // started.
    await supabase
      .from("academy_exam_releases")
      .update({ attempt_id: null })
      .eq("id", release.id);
    throw new Error(error.message);
  }

  return { ok: true, attempt: data as ExamAttempt, resumed: false };
}

export type SaveResult =
  | { ok: true; remainingMs: number }
  | { ok: false; reason: "no-attempt" | "expired" | "not-configured" };

/**
 * Save one answer.
 *
 * Read-modify-write on the answers object rather than a row per answer: an
 * attempt is one student typing into one paper, so there is no concurrency to
 * lose, and it keeps the whole sitting in a single row that can be read back
 * in one query while marking.
 *
 * The expiry check happens here, against the stored deadline. A browser whose
 * countdown has been edited to show an hour left gets a refusal.
 */
export async function saveAnswer(input: {
  studentId: string;
  questionId: string;
  value: { status?: string; test?: string; outcome?: string; rule?: string; text?: string };
}): Promise<SaveResult> {
  const supabase = academyDb();
  if (!supabase) return { ok: false, reason: "not-configured" };

  const attempt = await liveAttempt(input.studentId);
  if (!attempt) return { ok: false, reason: "no-attempt" };

  if (expired(attempt.expires_at)) {
    await finalizeAttempt(attempt.id, "time");
    return { ok: false, reason: "expired" };
  }

  const answers: AnswerSheet = { ...(attempt.answers ?? {}) };
  const current = answers[input.questionId] ?? {};
  const next = { ...current };

  if (typeof input.value.status === "string") next.status = input.value.status.slice(0, 40);
  if (typeof input.value.test === "string") next.test = input.value.test.slice(0, 60);
  if (typeof input.value.outcome === "string") next.outcome = input.value.outcome.slice(0, 60);
  if (typeof input.value.rule === "string") next.rule = input.value.rule.slice(0, 60);
  // Generous, and still bounded: the longest model answer on the paper is a
  // pair of file notes.
  if (typeof input.value.text === "string") next.text = input.value.text.slice(0, 6000);

  answers[input.questionId] = next;

  const { error } = await supabase
    .from("academy_exam_attempts")
    .update({ answers })
    .eq("id", attempt.id)
    .is("submitted_at", null);

  if (error) throw new Error(error.message);

  return {
    ok: true,
    remainingMs: Math.max(0, new Date(attempt.expires_at).getTime() - Date.now()),
  };
}

/**
 * Close a sitting and mark everything that marks itself.
 *
 * Called when the student presses submit, when their time runs out, and
 * lazily whenever anything notices an attempt that is past its deadline — so
 * a student who simply closes the laptop still ends up with a submitted paper
 * marked out of whatever they had answered, rather than a sitting that stays
 * open for ever.
 *
 * Idempotent: a second call on a submitted attempt returns the row untouched.
 */
export async function finalizeAttempt(
  attemptId: string,
  reason: "student" | "time"
): Promise<ExamAttempt | null> {
  const supabase = academyDb();
  if (!supabase) return null;

  const attempt = await attemptById(attemptId);
  if (!attempt) return null;
  if (attempt.submitted_at) return attempt;

  const autoMarks = markAuto(attempt.paper, attempt.parts, attempt.answers ?? {});
  const totals = partTotals(attempt.paper, attempt.parts, autoMarks, attempt.marks);
  const decided = verdict(attempt.paper, attempt.parts, autoMarks, attempt.marks);

  // Time-outs are recorded at the deadline, not at the moment somebody
  // noticed. The sitting ended when the clock did.
  const submittedAt =
    reason === "time" ? attempt.expires_at : new Date().toISOString();

  const { data, error } = await supabase
    .from("academy_exam_attempts")
    .update({
      submitted_at: submittedAt,
      submitted_reason: reason,
      auto_marks: autoMarks,
      part_totals: totals,
      result: decided?.result ?? null,
      failed_parts: decided?.failedParts ?? null,
    })
    .eq("id", attempt.id)
    .is("submitted_at", null)
    .select(ATTEMPT_COLS)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return attemptById(attempt.id);

  const row = data as ExamAttempt;
  if (decided?.result === "pass") await certifyIfDue(attempt.student_id, row.id);
  return row;
}

/** Close out anything whose two hours have passed. Cheap, and safe to call. */
export async function sweepExpiredAttempts(): Promise<number> {
  const supabase = academyDb();
  if (!supabase) return 0;

  const { data, error } = await supabase
    .from("academy_exam_attempts")
    .select("id, expires_at")
    .is("submitted_at", null)
    .lt("expires_at", new Date().toISOString());

  if (error) throw new Error(error.message);

  let closed = 0;
  for (const row of data ?? []) {
    await finalizeAttempt(row.id as string, "time");
    closed += 1;
  }
  return closed;
}

/* --------------------------------------------------------------- marking -- */

/**
 * Record the instructor's marks for the written parts.
 *
 * Marks are merged rather than replaced, so Part C can be marked on Tuesday
 * and Part D on Thursday without the first lot vanishing. The verdict is
 * recomputed from scratch every time, and a pass writes the certification
 * row — which is the only thing that makes a certificate downloadable.
 */
export async function markAttempt(input: {
  attemptId: string;
  marks: MarkSheet;
  notes?: string | null;
  by: string;
}): Promise<ExamAttempt | null> {
  const supabase = academyDb();
  if (!supabase) return null;

  const attempt = await attemptById(input.attemptId);
  if (!attempt) return null;
  if (!attempt.submitted_at) {
    throw new Error("That paper has not been handed in yet.");
  }

  const merged: MarkSheet = { ...(attempt.marks ?? {}) };
  for (const [qid, value] of Object.entries(input.marks)) {
    if (typeof value !== "number" || Number.isNaN(value)) continue;
    merged[qid] = Math.max(0, Math.round(value));
  }

  const totals = partTotals(attempt.paper, attempt.parts, attempt.auto_marks, merged);
  const decided = verdict(attempt.paper, attempt.parts, attempt.auto_marks, merged);

  const { data, error } = await supabase
    .from("academy_exam_attempts")
    .update({
      marks: merged,
      part_totals: totals,
      result: decided?.result ?? null,
      failed_parts: decided?.failedParts ?? null,
      marker_notes: input.notes?.slice(0, 4000) ?? attempt.marker_notes,
      marked_by: input.by.slice(0, 120),
      marked_at: decided ? new Date().toISOString() : null,
    })
    .eq("id", attempt.id)
    .select(ATTEMPT_COLS)
    .single();

  if (error) throw new Error(error.message);

  await certifyIfDue(attempt.student_id, attempt.id);
  return data as ExamAttempt;
}

/** Everything handed in and not yet fully marked, newest first. */
export async function markingQueue(): Promise<
  (ExamAttempt & { student: Pick<Student, "id" | "first_name" | "last_name" | "email" | "cohort"> | null })[]
> {
  const supabase = academyDb();
  if (!supabase) return [];

  await sweepExpiredAttempts();

  const { data, error } = await supabase
    .from("academy_exam_attempts")
    .select(
      `${ATTEMPT_COLS}, student:academy_students (id, first_name, last_name, email, cohort)`
    )
    .not("submitted_at", "is", null)
    .order("submitted_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as never;
}

/* --------------------------------------------------------- certification -- */

/**
 * A number that is stable, quotable down a phone, and not a database id.
 *
 * Derived from the student id, so it is the same number every time it is
 * generated and survives a row being rewritten. It is an identifier, not a
 * secret — it appears on the certificate itself.
 */
export function certificateNumber(student: {
  id: string;
  cohort: string;
}): string {
  const tail = crypto
    .createHash("sha256")
    .update(student.id)
    .digest("hex")
    .slice(0, 6)
    .toUpperCase();
  const cohort = student.cohort.replace(/[^a-zA-Z0-9]+/g, "").toUpperCase();
  return `STIQ-${cohort}-${tail}`;
}

export async function certificationFor(
  studentId: string
): Promise<Certification | null> {
  const supabase = academyDb();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("academy_certifications")
    .select(CERT_COLS)
    .eq("student_id", studentId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as Certification) ?? null;
}

export async function listCertifications(): Promise<Certification[]> {
  const supabase = academyDb();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("academy_certifications")
    .select(CERT_COLS)
    .order("passed_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as Certification[];
}

/**
 * Write the pass record, if and only if all four parts are genuinely passed.
 *
 * Called after every marking action. It reads every sitting the student has
 * had and takes each part at its best, because a retake covers only the parts
 * that were failed — Parts A, B and D from December and Part C from the
 * January retake is a pass, and nothing else in the system would see that.
 *
 * Does nothing if a certification already exists, so re-marking a paper does
 * not mint a second certificate or move the date on the first.
 */
export async function certifyIfDue(
  studentId: string,
  attemptId: string | null
): Promise<Certification | null> {
  const supabase = academyDb();
  if (!supabase) return null;

  const existing = await certificationFor(studentId);
  if (existing) return existing;

  const attempts = await attemptsFor(studentId);
  const where = standing(attempts);
  if (!where.passed) return null;

  const { data: student, error: studentError } = await supabase
    .from("academy_students")
    .select("id, cohort")
    .eq("id", studentId)
    .maybeSingle();

  if (studentError) throw new Error(studentError.message);
  if (!student) return null;

  const { data, error } = await supabase
    .from("academy_certifications")
    .insert({
      student_id: studentId,
      route: "online",
      attempt_id: attemptId,
      paper: attempts.find((a) => a.id === attemptId)?.paper ?? null,
      part_totals: where.parts,
      certificate_no: certificateNumber(student as { id: string; cohort: string }),
      recorded_by: "the exam, marked",
    })
    .select(CERT_COLS)
    .single();

  // A race with a second marking action is a duplicate key, not a problem.
  if (error) {
    if (/duplicate key/i.test(error.message)) return certificationFor(studentId);
    throw new Error(error.message);
  }
  return data as Certification;
}

/**
 * Record a pass from the paper sitting.
 *
 * The students who come to Mack Ave in December have no attempt row and never
 * will, and their certificate has to come out of the same door as everybody
 * else's. So the instructor records the pass against the roster directly, and
 * from there on nothing distinguishes the two routes except the word in
 * `route`.
 */
export async function recordPaperPass(input: {
  studentId: string;
  by: string;
}): Promise<Certification | null> {
  const supabase = academyDb();
  if (!supabase) return null;

  const existing = await certificationFor(input.studentId);
  if (existing) return existing;

  const { data: student, error: studentError } = await supabase
    .from("academy_students")
    .select("id, cohort")
    .eq("id", input.studentId)
    .maybeSingle();

  if (studentError) throw new Error(studentError.message);
  if (!student) return null;

  const { data, error } = await supabase
    .from("academy_certifications")
    .insert({
      student_id: input.studentId,
      route: "paper",
      certificate_no: certificateNumber(student as { id: string; cohort: string }),
      recorded_by: input.by.slice(0, 120),
    })
    .select(CERT_COLS)
    .single();

  if (error) {
    if (/duplicate key/i.test(error.message)) return certificationFor(input.studentId);
    throw new Error(error.message);
  }
  return data as Certification;
}

/** Withdraw a pass. The row stays; the certificate stops serving. */
export async function revokeCertification(studentId: string, by: string) {
  const supabase = academyDb();
  if (!supabase) return;

  const { error } = await supabase
    .from("academy_certifications")
    .update({ revoked_at: new Date().toISOString(), revoked_by: by.slice(0, 120) })
    .eq("student_id", studentId);

  if (error) throw new Error(error.message);
}

/** Put a revoked pass back, for the one that was revoked by mistake. */
export async function restoreCertification(studentId: string) {
  const supabase = academyDb();
  if (!supabase) return;

  const { error } = await supabase
    .from("academy_certifications")
    .update({ revoked_at: null, revoked_by: null })
    .eq("student_id", studentId);

  if (error) throw new Error(error.message);
}

/* ----------------------------------------------------------- Part C files -- */

export async function listExamFiles(attemptId: string): Promise<ExamFile[]> {
  const supabase = academyDb();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("academy_exam_files")
    .select(FILE_COLS)
    .eq("attempt_id", attemptId)
    .is("deleted_at", null)
    .order("uploaded_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as ExamFile[];
}

/** Six attachments is more than a complete return needs. */
export const MAX_EXAM_FILES = 6;

export async function saveExamFile(input: {
  attemptId: string;
  questionId: string | null;
  fileName: string;
  mimeType: string;
  ext: string;
  bytes: Buffer;
  ip: string | null;
}): Promise<ExamFile> {
  const supabase = academyDb();
  if (!supabase) throw new Error("Academy storage is not configured");

  const existing = await listExamFiles(input.attemptId);
  if (existing.length >= MAX_EXAM_FILES) {
    throw new Error("That is as many attachments as one paper will hold.");
  }

  const path = `${input.attemptId}/${crypto.randomUUID()}.${input.ext}`;

  const up = await supabase.storage
    .from(EXAM_BUCKET)
    .upload(path, input.bytes, { contentType: input.mimeType, upsert: false });
  if (up.error) throw new Error(up.error.message);

  const { data, error } = await supabase
    .from("academy_exam_files")
    .insert({
      attempt_id: input.attemptId,
      question_id: input.questionId?.slice(0, 12) ?? null,
      storage_path: path,
      file_name:
        input.fileName
          .replace(/[^\w.\- ]+/g, "")
          .replace(/^\.+/, "")
          .trim()
          .slice(0, 120) || `attachment.${input.ext}`,
      mime_type: input.mimeType,
      size_bytes: input.bytes.length,
      uploaded_ip: input.ip?.slice(0, 64) ?? null,
    })
    .select(FILE_COLS)
    .single();

  if (error) {
    await supabase.storage.from(EXAM_BUCKET).remove([path]);
    throw new Error(error.message);
  }

  return data as ExamFile;
}

/** Sixty seconds, as everywhere else in the Academy. */
export async function signedUrlForExamFile(
  fileId: string
): Promise<{ url: string; fileName: string } | null> {
  const supabase = academyDb();
  if (!supabase) return null;

  const { data: row, error } = await supabase
    .from("academy_exam_files")
    .select("storage_path, file_name, deleted_at")
    .eq("id", fileId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!row || row.deleted_at) return null;

  const signed = await supabase.storage
    .from(EXAM_BUCKET)
    .createSignedUrl(row.storage_path as string, 60, {
      download: row.file_name as string,
    });

  if (signed.error) throw new Error(signed.error.message);
  return { url: signed.data.signedUrl, fileName: row.file_name as string };
}

/* ------------------------------------------------------------- the roster -- */

/** Everyone who could be released a paper, with where they stand. */
export async function examRoster(): Promise<
  {
    student: Student;
    attempts: ExamAttempt[];
    release: ExamRelease | null;
    certification: Certification | null;
  }[]
> {
  const supabase = academyDb();
  if (!supabase) return [];

  await sweepExpiredAttempts();

  const { data: students, error } = await supabase
    .from("academy_students")
    .select("id, email, first_name, last_name, role, cohort, status")
    .eq("status", "active")
    .order("first_name");

  if (error) throw new Error(error.message);

  const rows: {
    student: Student;
    attempts: ExamAttempt[];
    release: ExamRelease | null;
    certification: Certification | null;
  }[] = [];

  for (const student of (students ?? []) as Student[]) {
    rows.push({
      student,
      attempts: await attemptsFor(student.id),
      release: await openRelease(student.id),
      certification: await certificationFor(student.id),
    });
  }

  return rows;
}

export { normalizeEmail };
