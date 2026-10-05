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

/* -------------------------------------------------- access requests ------ */

export type AccessRequest = {
  id: string;
  email: string;
  name: string;
  note: string | null;
  created_at: string;
  handled_at: string | null;
};

/**
 * Record somebody asking to be added to the roster.
 *
 * Deliberately separate from academy_students: nothing in this codebase turns
 * a request into an enrolment. The instructor reads it and runs the insert
 * herself, which is the only reason it is safe to let anyone submit one.
 *
 * Duplicates are allowed rather than upserted. Somebody asking twice is
 * information — usually that the first request was missed.
 */
export async function createAccessRequest(input: {
  email: string;
  name: string;
  note?: string | null;
  ip?: string | null;
}): Promise<boolean> {
  const supabase = db();
  if (!supabase) return false;

  const { error } = await supabase.from("academy_access_requests").insert({
    email: normalizeEmail(input.email),
    name: input.name.trim().slice(0, 120),
    note: input.note?.trim().slice(0, 600) || null,
    ip: input.ip ?? null,
  });

  if (error) throw new Error(error.message);
  return true;
}

/** How many requests this address has filed in the last day, so one person
 *  cannot fill the instructor's inbox by pressing the button repeatedly. */
export async function recentRequestCount(email: string, withinMinutes = 1440) {
  const supabase = db();
  if (!supabase) return 0;

  const since = new Date(Date.now() - withinMinutes * 60_000).toISOString();
  const { count, error } = await supabase
    .from("academy_access_requests")
    .select("id", { count: "exact", head: true })
    .eq("email", normalizeEmail(email))
    .gte("created_at", since);

  if (error) throw new Error(error.message);
  return count ?? 0;
}

/** Open requests, newest first, for the instructor dashboard. */
export async function getPendingAccessRequests(
  limit = 25
): Promise<AccessRequest[]> {
  const supabase = db();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("academy_access_requests")
    .select("id, email, name, note, created_at, handled_at")
    .is("handled_at", null)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data as AccessRequest[]) ?? [];
}

/* --------------------------------------------- modules: video and note --- */

export type ModuleExtra = {
  module_idx: number;
  video_url: string | null;
  video_title: string | null;
  note: string | null;
  updated_at: string;
};

export async function getModuleExtras(): Promise<ModuleExtra[]> {
  const supabase = db();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("academy_modules")
    .select("module_idx, video_url, video_title, note, updated_at")
    .order("module_idx");

  if (error) throw new Error(error.message);
  return (data as ModuleExtra[]) ?? [];
}

/** Save a module's video and note. An empty string clears the field rather
 *  than storing "", so removing a video is the same gesture as adding one. */
export async function saveModuleExtra(input: {
  moduleIdx: number;
  videoUrl?: string | null;
  videoTitle?: string | null;
  note?: string | null;
  byStudentId: string;
}) {
  const supabase = db();
  if (!supabase) throw new Error("Academy storage is not configured");

  const clean = (v: string | null | undefined) => {
    const t = (v ?? "").trim();
    return t.length ? t.slice(0, 2000) : null;
  };

  const { error } = await supabase.from("academy_modules").upsert(
    {
      module_idx: input.moduleIdx,
      video_url: clean(input.videoUrl),
      video_title: clean(input.videoTitle),
      note: clean(input.note),
      updated_at: new Date().toISOString(),
      updated_by: input.byStudentId,
    },
    { onConflict: "module_idx" }
  );

  if (error) throw new Error(error.message);
}

/* ------------------------------------------------------- announcements --- */

export type Announcement = {
  id: string;
  body: string;
  emailed_at: string | null;
  created_at: string;
  hidden: boolean;
};

export async function getAnnouncements(opts?: {
  includeHidden?: boolean;
  limit?: number;
}): Promise<Announcement[]> {
  const supabase = db();
  if (!supabase) return [];

  let q = supabase
    .from("academy_announcements")
    .select("id, body, emailed_at, created_at, hidden")
    .order("created_at", { ascending: false })
    .limit(opts?.limit ?? 20);

  if (!opts?.includeHidden) q = q.eq("hidden", false);

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data as Announcement[]) ?? [];
}

export async function createAnnouncement(input: {
  body: string;
  byStudentId: string;
  emailed: boolean;
}): Promise<Announcement> {
  const supabase = db();
  if (!supabase) throw new Error("Academy storage is not configured");

  const { data, error } = await supabase
    .from("academy_announcements")
    .insert({
      body: input.body.trim().slice(0, 4000),
      created_by: input.byStudentId,
      emailed_at: input.emailed ? new Date().toISOString() : null,
    })
    .select("id, body, emailed_at, created_at, hidden")
    .single();

  if (error) throw new Error(error.message);
  return data as Announcement;
}

export async function setAnnouncementHidden(id: string, hidden: boolean) {
  const supabase = db();
  if (!supabase) throw new Error("Academy storage is not configured");

  const { error } = await supabase
    .from("academy_announcements")
    .update({ hidden })
    .eq("id", id);

  if (error) throw new Error(error.message);
}

/** Active trainees' addresses, for emailing an announcement. Instructors are
 *  left out — she does not need her own notices in her inbox. */
export async function getStudentEmails(cohort: string): Promise<
  { email: string; first_name: string }[]
> {
  const supabase = db();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("academy_students")
    .select("email, first_name")
    .eq("cohort", cohort)
    .eq("status", "active")
    .eq("role", "student");

  if (error) throw new Error(error.message);
  return (data ?? []) as { email: string; first_name: string }[];
}

/* ------------------------------------------------- managing the roster --- */

/**
 * Add somebody to the roster, or update the row that is already there.
 *
 * Enrolment is the one privileged write in this codebase, and the only caller
 * is the instructor-gated roster route. Keeping it on conflict-update rather
 * than insert means re-adding an address that was withdrawn reactivates it
 * with its progress intact, which is what somebody re-enrolling after a break
 * actually wants.
 */
export async function upsertStudent(input: {
  email: string;
  firstName: string;
  lastName?: string | null;
  role?: "student" | "instructor";
  cohort: string;
}): Promise<Student> {
  const supabase = db();
  if (!supabase) throw new Error("Academy storage is not configured");

  const { data, error } = await supabase
    .from("academy_students")
    .upsert(
      {
        email: normalizeEmail(input.email),
        first_name: input.firstName.trim().slice(0, 80),
        last_name: input.lastName?.trim().slice(0, 80) || null,
        role: input.role ?? "student",
        cohort: input.cohort,
        status: "active",
      },
      { onConflict: "email" }
    )
    .select("id, email, first_name, last_name, role, cohort, status")
    .single();

  if (error) throw new Error(error.message);
  return data as Student;
}

/**
 * Withdraw or reinstate somebody.
 *
 * Withdrawing never deletes. Their progress rows stay, which matters if a
 * decision is reversed, and it takes effect on their next page load rather
 * than whenever their session cookie happens to expire — currentStudent()
 * re-reads the roster on every request for exactly this reason.
 */
export async function setStudentStatus(
  id: string,
  status: "active" | "withdrawn"
) {
  const supabase = db();
  if (!supabase) throw new Error("Academy storage is not configured");

  const { error } = await supabase
    .from("academy_students")
    .update({ status })
    .eq("id", id);

  if (error) throw new Error(error.message);
}

/** Everyone on the roster, withdrawn included — the management view, as
 *  opposed to getCohort() which is the teaching view. */
export async function getRoster(): Promise<
  (Student & { last_seen_at: string | null; created_at: string })[]
> {
  const supabase = db();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("academy_students")
    .select(
      "id, email, first_name, last_name, role, cohort, status, last_seen_at, created_at"
    )
    .order("role")
    .order("first_name");

  if (error) throw new Error(error.message);
  return (data ?? []) as (Student & {
    last_seen_at: string | null;
    created_at: string;
  })[];
}

/** Close an access request, whether it was approved or turned down. Requests
 *  are never deleted — a declined one staying on file is a feature. */
export async function markRequestHandled(id: string) {
  const supabase = db();
  if (!supabase) throw new Error("Academy storage is not configured");

  const { error } = await supabase
    .from("academy_access_requests")
    .update({ handled_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw new Error(error.message);
}

export async function getAccessRequestById(
  id: string
): Promise<AccessRequest | null> {
  const supabase = db();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("academy_access_requests")
    .select("id, email, name, note, created_at, handled_at")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as AccessRequest) ?? null;
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

/* --------------------------------------------- preparer onboarding ------- */

/**
 * Paperwork tracking for preparers joining the practice.
 *
 * What is NOT here is the point of it. No SSN, no date of birth, no licence
 * number, no uploaded file, no storage bucket. The table records that a
 * document was received or sighted and on what day; the documents themselves
 * live with a filer that already carries the compliance burden for holding
 * them. The reasoning is written out at length above the table definition in
 * supabase/academy.sql, and it should be read before anyone adds a column.
 *
 * The practical consequence: this feature stores nothing that a breach would
 * make into a reportable event, so it needs no multi-factor authentication to
 * be lawful — which the Academy's emailed one-time code could not provide.
 */

export type OnboardingRow = {
  id: string;
  email: string;
  first_name: string;
  last_name: string | null;
  student_id: string | null;
  ptin: string | null;
  ptin_verified_at: string | null;
  w9_received_at: string | null;
  id_sighted_at: string | null;
  security_plan_signed_at: string | null;
  notes: string | null;
  confirmed_by: string | null;
  archived: boolean;
  created_at: string;
  updated_at: string;
};

// One string literal rather than a concatenation: supabase-js reads the
// select list at the type level, and a concatenated string is just `string` to
// it, which loses the row typing and makes every cast below an error.
// prettier-ignore
const ONBOARDING_COLS = "id, email, first_name, last_name, student_id, ptin, ptin_verified_at, w9_received_at, id_sighted_at, security_plan_signed_at, notes, confirmed_by, archived, created_at, updated_at" as const;

/** Everyone being onboarded, archived rows included — the page decides which
 *  to show, the same way getRoster() hands over withdrawn students. */
export async function getOnboarding(): Promise<OnboardingRow[]> {
  const supabase = db();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("academy_onboarding")
    .select(ONBOARDING_COLS)
    .order("archived")
    .order("first_name");

  if (error) throw new Error(error.message);
  return (data ?? []) as OnboardingRow[];
}

/**
 * Start tracking somebody, or revive the row that is already there.
 *
 * Links to the roster when the same address is enrolled, which is how a
 * trainee who finishes the course and joins the practice carries one identity
 * rather than two. The link is looked up here rather than passed in, so it
 * cannot be forged by the caller and cannot go stale against a typo.
 */
export async function upsertOnboarding(input: {
  email: string;
  firstName: string;
  lastName?: string | null;
}): Promise<OnboardingRow> {
  const supabase = db();
  if (!supabase) throw new Error("Academy storage is not configured");

  const email = normalizeEmail(input.email);
  const student = await findStudentByEmail(email);

  const { data, error } = await supabase
    .from("academy_onboarding")
    .upsert(
      {
        email,
        first_name: input.firstName.trim().slice(0, 80),
        last_name: input.lastName?.trim().slice(0, 80) || null,
        student_id: student?.id ?? null,
        archived: false,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "email" }
    )
    .select(ONBOARDING_COLS)
    .single();

  if (error) throw new Error(error.message);
  return data as OnboardingRow;
}

/**
 * Save the PTIN, the four checks and the note.
 *
 * Only the keys present in `patch` are written, so ticking one box does not
 * quietly blank a field somebody else filled in. `null` is a real value here
 * — it is how a box gets un-ticked after being ticked by mistake — which is
 * why this takes an explicit patch rather than a whole row.
 */
export async function saveOnboarding(
  id: string,
  patch: {
    ptin?: string | null;
    ptin_verified_at?: string | null;
    w9_received_at?: string | null;
    id_sighted_at?: string | null;
    security_plan_signed_at?: string | null;
    notes?: string | null;
  },
  confirmedBy: string
): Promise<OnboardingRow> {
  const supabase = db();
  if (!supabase) throw new Error("Academy storage is not configured");

  const { data, error } = await supabase
    .from("academy_onboarding")
    .update({
      ...patch,
      confirmed_by: confirmedBy,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select(ONBOARDING_COLS)
    .single();

  if (error) throw new Error(error.message);
  return data as OnboardingRow;
}

/** Archive or restore. Never deletes: a compliance record that somebody
 *  ticked and then hid is still a record of what was ticked. */
export async function setOnboardingArchived(id: string, archived: boolean) {
  const supabase = db();
  if (!supabase) throw new Error("Academy storage is not configured");

  const { error } = await supabase
    .from("academy_onboarding")
    .update({ archived, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw new Error(error.message);
}
