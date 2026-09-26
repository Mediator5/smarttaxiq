import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import crypto from "crypto";

/**
 * Every database call the Academy makes.
 *
 * Same posture as src/lib/store.ts: one server-side client using the
 * service-role key, Row Level Security enabled with no policies, and no
 * Supabase in the browser at all. The Academy stores real names, email
 * addresses and exam-adjacent scores for a handful of people, so it gets the
 * same treatment the lead list gets rather than a looser one.
 *
 * Env-gated like the rest of the site. With SUPABASE_URL unset, every
 * function here returns null or an empty result and the Academy routes render
 * a clear "not configured yet" state instead of a stack trace.
 */

let client: SupabaseClient | null = null;

export function academyConfigured() {
  return Boolean(
    process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

function db() {
  if (!academyConfigured()) return null;
  if (!client) {
    client = createClient(
      process.env.SUPABASE_URL!,
      // Never expose this key, and never prefix it with NEXT_PUBLIC_. It
      // bypasses RLS and can read every student's scores.
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );
  }
  return client;
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export type Student = {
  id: string;
  email: string;
  first_name: string;
  last_name: string | null;
  role: "student" | "instructor";
  cohort: string;
  status: "active" | "withdrawn";
};

export type ProgressRow = {
  student_id: string;
  module_idx: number;
  best_score: number;
  passed: boolean;
  attempts: number;
  updated_at: string;
};

/* ------------------------------------------------------------ the roster -- */

/**
 * Look someone up by email.
 *
 * Returns null for an address that is not enrolled, and null for one that is
 * enrolled but withdrawn. The caller must not tell the visitor which of those
 * happened — see requestCode in auth.ts for why.
 */
export async function findStudentByEmail(
  email: string
): Promise<Student | null> {
  const supabase = db();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("academy_students")
    .select("id, email, first_name, last_name, role, cohort, status")
    .eq("email", normalizeEmail(email))
    .eq("status", "active")
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as Student) ?? null;
}

export async function findStudentById(id: string): Promise<Student | null> {
  const supabase = db();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("academy_students")
    .select("id, email, first_name, last_name, role, cohort, status")
    .eq("id", id)
    .eq("status", "active")
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as Student) ?? null;
}

/** Stamped on every successful sign-in, and on every progress write. It is
 *  the column the instructor dashboard's "last seen" comes from, and the most
 *  useful early warning there is: a student who has not opened the course in
 *  nine days has usually already dropped out and not said so. */
export async function touchStudent(id: string) {
  const supabase = db();
  if (!supabase) return;
  await supabase
    .from("academy_students")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("id", id);
}

/* ------------------------------------------------------------ login codes - */

export function hashCode(code: string) {
  return crypto.createHash("sha256").update(code.trim()).digest("hex");
}

export async function createLoginCode(input: {
  studentId: string;
  code: string;
  ttlMinutes: number;
  ip?: string | null;
}) {
  const supabase = db();
  if (!supabase) return;

  const expires = new Date(Date.now() + input.ttlMinutes * 60_000);
  const { error } = await supabase.from("academy_login_codes").insert({
    student_id: input.studentId,
    code_hash: hashCode(input.code),
    expires_at: expires.toISOString(),
    ip: input.ip ?? null,
  });
  if (error) throw new Error(error.message);
}

/** How many codes this student has asked for in the last hour. Rate limiting
 *  lives here rather than in memory because serverless functions do not share
 *  memory between invocations — an in-process counter would reset constantly
 *  and protect nothing. */
export async function recentCodeCount(studentId: string, withinMinutes = 60) {
  const supabase = db();
  if (!supabase) return 0;

  const since = new Date(Date.now() - withinMinutes * 60_000).toISOString();
  const { count, error } = await supabase
    .from("academy_login_codes")
    .select("id", { count: "exact", head: true })
    .eq("student_id", studentId)
    .gte("created_at", since);

  if (error) throw new Error(error.message);
  return count ?? 0;
}

export type CodeCheck =
  | { ok: true }
  | { ok: false; reason: "no-code" | "expired" | "wrong" | "locked" };

/**
 * Check a submitted code against the newest unused one for this student.
 *
 * Only the newest is considered: asking for a second code should invalidate
 * the first in practice, and comparing against every outstanding code widens
 * the guessing window for no benefit.
 */
export async function consumeLoginCode(
  studentId: string,
  code: string
): Promise<CodeCheck> {
  const supabase = db();
  if (!supabase) return { ok: false, reason: "no-code" };

  const { data, error } = await supabase
    .from("academy_login_codes")
    .select("id, code_hash, expires_at, used_at, attempts")
    .eq("student_id", studentId)
    .is("used_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return { ok: false, reason: "no-code" };
  if (data.attempts >= 5) return { ok: false, reason: "locked" };
  if (new Date(data.expires_at as string).getTime() < Date.now()) {
    return { ok: false, reason: "expired" };
  }

  // Constant-time compare. The hashes are the same length by construction, so
  // timingSafeEqual cannot throw here.
  const submitted = Buffer.from(hashCode(code));
  const stored = Buffer.from(data.code_hash as string);
  const match =
    submitted.length === stored.length &&
    crypto.timingSafeEqual(submitted, stored);

  if (!match) {
    await supabase
      .from("academy_login_codes")
      .update({ attempts: (data.attempts as number) + 1 })
      .eq("id", data.id);
    return { ok: false, reason: "wrong" };
  }

  await supabase
    .from("academy_login_codes")
    .update({ used_at: new Date().toISOString() })
    .eq("id", data.id);

  return { ok: true };
}

/* --------------------------------------------------------------- progress - */

export async function getProgress(studentId: string): Promise<ProgressRow[]> {
  const supabase = db();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("academy_progress")
    .select("student_id, module_idx, best_score, passed, attempts, updated_at")
    .eq("student_id", studentId)
    .order("module_idx");

  if (error) throw new Error(error.message);
  return (data as ProgressRow[]) ?? [];
}

/**
 * Record an attempt at one module's knowledge check.
 *
 * best_score only ever goes up, and `passed` is sticky once earned. A student
 * who passes at 90 and then retakes for practice and scores 60 has not lost
 * their pass, and the dashboard should not suggest otherwise.
 *
 * The read-then-write is not a transaction, which is fine: a single student
 * submitting two attempts at the same module in the same instant is not a
 * thing that happens, and the worst case is one attempt count lost.
 */
export async function recordAttempt(input: {
  studentId: string;
  moduleIdx: number;
  score: number;
  passed: boolean;
}): Promise<ProgressRow | null> {
  const supabase = db();
  if (!supabase) return null;

  const score = Math.max(0, Math.min(100, Math.round(input.score)));

  const { data: existing } = await supabase
    .from("academy_progress")
    .select("best_score, passed, attempts")
    .eq("student_id", input.studentId)
    .eq("module_idx", input.moduleIdx)
    .maybeSingle();

  const row = {
    student_id: input.studentId,
    module_idx: input.moduleIdx,
    best_score: Math.max(score, (existing?.best_score as number) ?? 0),
    passed: Boolean(existing?.passed) || input.passed,
    attempts: ((existing?.attempts as number) ?? 0) + 1,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("academy_progress")
    .upsert(row, { onConflict: "student_id,module_idx" })
    .select("student_id, module_idx, best_score, passed, attempts, updated_at")
    .single();

  if (error) throw new Error(error.message);
  return data as ProgressRow;
}

/* ------------------------------------------------------------- the cohort - */

export type CohortRow = Student & {
  last_seen_at: string | null;
  progress: ProgressRow[];
};

/**
 * Everyone in a cohort with their progress, for the instructor dashboard.
 *
 * Two queries rather than a join, because supabase-js's nested selects need a
 * declared foreign-key relationship name and this reads more plainly. At five
 * students it is not a performance question; at fifty it still is not.
 */
export async function getCohort(cohort: string): Promise<CohortRow[]> {
  const supabase = db();
  if (!supabase) return [];

  const { data: students, error: e1 } = await supabase
    .from("academy_students")
    .select(
      "id, email, first_name, last_name, role, cohort, status, last_seen_at"
    )
    .eq("cohort", cohort)
    .eq("status", "active")
    .eq("role", "student")
    .order("first_name");

  if (e1) throw new Error(e1.message);
  const list = (students ?? []) as (Student & { last_seen_at: string | null })[];
  if (!list.length) return [];

  const { data: rows, error: e2 } = await supabase
    .from("academy_progress")
    .select("student_id, module_idx, best_score, passed, attempts, updated_at")
    .in(
      "student_id",
      list.map((s) => s.id)
    );

  if (e2) throw new Error(e2.message);

  const byStudent = new Map<string, ProgressRow[]>();
  for (const r of (rows ?? []) as ProgressRow[]) {
    const bucket = byStudent.get(r.student_id) ?? [];
    bucket.push(r);
    byStudent.set(r.student_id, bucket);
  }

  return list.map((s) => ({ ...s, progress: byStudent.get(s.id) ?? [] }));
}
