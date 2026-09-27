import crypto from "crypto";
import { cookies } from "next/headers";
import {
  consumeLoginCode,
  createLoginCode,
  findStudentByEmail,
  findStudentById,
  recentCodeCount,
  touchStudent,
  type Student,
} from "./store";
import { sendLoginCode } from "./mail";

/**
 * Sign-in for the Academy.
 *
 * Passwordless, by design rather than by shortcut. The alternative is storing
 * passwords for five people who will each use this site for ten weeks, which
 * means a hashing choice, a reset flow, a lockout policy and a breach to worry
 * about — all to protect an account whose only power is to record a quiz
 * score. A one-time code to an address already on the roster is the honest
 * amount of security for what is actually behind the door, and it removes a
 * whole category of thing that can go wrong.
 *
 * The session is a signed cookie, not a database row. There is no session
 * table to grow, expire or clean up, and a serverless function can verify one
 * without a round trip. HMAC-SHA256 over the payload with ACADEMY_SESSION_SECRET.
 */

const COOKIE = "stiq_academy";
const SESSION_DAYS = 30;
const CODE_TTL_MINUTES = 15;
/** Codes an address may request in an hour before we stop sending. Generous
 *  enough that a student fighting their spam folder is never locked out, tight
 *  enough that the endpoint is not a free mail cannon. */
const CODES_PER_HOUR = 5;

/**
 * Whether the session secret is usable — not merely present.
 *
 * This deliberately applies the SAME length rule as secret() below. An earlier
 * version only checked for a non-empty value, so a too-short secret passed the
 * readiness check and then threw on first use, which is a much worse failure
 * than the setup page.
 */
export function sessionSecretConfigured() {
  const value = process.env.ACADEMY_SESSION_SECRET;
  return Boolean(value && value.length >= 24);
}

function secret() {
  const value = process.env.ACADEMY_SESSION_SECRET;
  if (!value || value.length < 24) {
    throw new Error(
      "ACADEMY_SESSION_SECRET is missing or too short — set at least 24 random characters"
    );
  }
  return value;
}

/* ----------------------------------------------------------- the session -- */

type SessionPayload = { sid: string; exp: number };

function sign(data: string) {
  return crypto.createHmac("sha256", secret()).update(data).digest("base64url");
}

function encodeSession(payload: SessionPayload) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body)}`;
}

function decodeSession(token: string): SessionPayload | null {
  const [body, mac] = token.split(".");
  if (!body || !mac) return null;

  const expected = Buffer.from(sign(body));
  const given = Buffer.from(mac);
  if (
    expected.length !== given.length ||
    !crypto.timingSafeEqual(expected, given)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8")
    ) as SessionPayload;
    if (!payload?.sid || typeof payload.exp !== "number") return null;
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function setSessionCookie(studentId: string) {
  const exp = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  cookies().set(COOKIE, encodeSession({ sid: studentId, exp }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export function clearSessionCookie() {
  cookies().set(COOKIE, "", { path: "/", maxAge: 0 });
}

/**
 * Who is signed in, or null.
 *
 * The cookie is only a claim about an id; the roster is the authority. This
 * re-reads the student on every request so that withdrawing someone — setting
 * status to 'withdrawn' — takes effect on their next page load rather than
 * whenever their cookie happens to expire.
 */
export async function currentStudent(): Promise<Student | null> {
  const token = cookies().get(COOKIE)?.value;
  if (!token) return null;
  if (!sessionSecretConfigured()) return null;

  const payload = decodeSession(token);
  if (!payload) return null;

  try {
    return await findStudentById(payload.sid);
  } catch {
    return null;
  }
}

/* -------------------------------------------------------------- sign-in --- */

/** Six digits, from a cryptographic source rather than Math.random. */
function newCode() {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
}

export type RequestCodeResult =
  | { ok: true }
  | {
      ok: false;
      reason: "not-enrolled" | "not-configured" | "throttled" | "send-failed";
    };

/**
 * Send a sign-in code, if the address is enrolled.
 *
 * An address that is NOT on the roster gets `not-enrolled`, and the page says
 * so plainly.
 *
 * This reverses the original design, which returned `ok: true` and sent
 * nothing, so that the endpoint could not be used to ask whether a given
 * person trains here. That protection was worth less than it cost. What it
 * actually bought: an attacker learns that one address among a cohort of five
 * at a small Detroit firm is or is not enrolled. What it cost: a trainee who
 * mistypes their own email — or whose address was entered slightly differently
 * on the roster — sits watching an inbox for a message that will never come,
 * with nothing on screen to suggest anything is wrong. That is the single most
 * likely real failure in a ten-week course, and silence makes it invisible to
 * the student AND to the trainer.
 *
 * The enumeration risk is mitigated instead where it belongs: per-IP rate
 * limiting on the route, so the endpoint cannot be walked through a list.
 */
export async function requestCode(
  email: string,
  ip?: string | null
): Promise<RequestCodeResult> {
  if (!sessionSecretConfigured()) return { ok: false, reason: "not-configured" };

  let student: Student | null = null;
  try {
    student = await findStudentByEmail(email);
  } catch (err) {
    console.error("[academy] roster lookup failed:", err);
    return { ok: false, reason: "not-configured" };
  }

  if (!student) return { ok: false, reason: "not-enrolled" };

  try {
    if ((await recentCodeCount(student.id)) >= CODES_PER_HOUR) {
      return { ok: false, reason: "throttled" };
    }

    const code = newCode();
    await createLoginCode({
      studentId: student.id,
      code,
      ttlMinutes: CODE_TTL_MINUTES,
      ip,
    });
    await sendLoginCode({
      to: student.email,
      firstName: student.first_name,
      code,
      minutes: CODE_TTL_MINUTES,
    });
    return { ok: true };
  } catch (err) {
    console.error("[academy] could not send a sign-in code:", err);
    return { ok: false, reason: "send-failed" };
  }
}

export type VerifyResult =
  | { ok: true; student: Student }
  | { ok: false; reason: "bad-code" | "locked" | "expired" | "not-configured" };

export async function verifyCode(
  email: string,
  code: string
): Promise<VerifyResult> {
  if (!sessionSecretConfigured()) return { ok: false, reason: "not-configured" };

  let student: Student | null = null;
  try {
    student = await findStudentByEmail(email);
  } catch (err) {
    console.error("[academy] roster lookup failed:", err);
    return { ok: false, reason: "not-configured" };
  }

  // An unknown address and a wrong code are reported identically, for the same
  // reason requestCode stays quiet.
  if (!student) return { ok: false, reason: "bad-code" };

  const check = await consumeLoginCode(student.id, code);
  if (!check.ok) {
    if (check.reason === "locked") return { ok: false, reason: "locked" };
    if (check.reason === "expired") return { ok: false, reason: "expired" };
    return { ok: false, reason: "bad-code" };
  }

  setSessionCookie(student.id);
  void touchStudent(student.id);
  return { ok: true, student };
}
