import { NextResponse } from "next/server";
import {
  academyConfigured,
  createAccessRequest,
  recentRequestCount,
} from "@/lib/academy/store";
import { sendAccessRequestAlert } from "@/lib/academy/mail";

export const dynamic = "force-dynamic";

/**
 * "I'm not on the roster — please add me."
 *
 * Open to anyone, because the sign-in page has just told them their address
 * is not enrolled and leaving them at a dead end helps nobody. Being open is
 * only safe because this GRANTS NOTHING: it writes a row to
 * academy_access_requests and sends an alert. There is no code path anywhere
 * in this codebase that promotes a request into academy_students. Enrolment
 * stays a deliberate act by the instructor.
 *
 * Two limits, because an open endpoint that sends mail always needs them:
 * per-IP in memory, and per-address in the database. The second is the real
 * one — serverless instances do not share memory, but they do share Postgres.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;
const MAX_PER_ADDRESS_PER_DAY = 3;

const hits = new Map<string, number[]>();
function rateLimited(ip: string) {
  const now = Date.now();
  const win = 60 * 60 * 1000;
  const list = (hits.get(ip) || []).filter((t) => now - t < win);
  list.push(now);
  hits.set(ip, list);
  if (hits.size > 5000) hits.clear();
  return list.length > 5;
}

export async function POST(request: Request) {
  try {
    if (!academyConfigured()) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "The Academy isn't finished being set up. Please call the office instead.",
        },
        { status: 503 }
      );
    }

    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";

    if (rateLimited(ip)) {
      return NextResponse.json(
        {
          ok: false,
          error: "Too many requests from this connection. Try again later.",
        },
        { status: 429 }
      );
    }

    const body = (await request.json().catch(() => null)) as {
      email?: unknown;
      name?: unknown;
      note?: unknown;
    } | null;

    const email = typeof body?.email === "string" ? body.email.trim() : "";
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const note = typeof body?.note === "string" ? body.note.trim() : "";

    if (!EMAIL_RE.test(email)) {
      return NextResponse.json(
        { ok: false, error: "Enter a valid email address." },
        { status: 400 }
      );
    }
    if (name.length < 2) {
      return NextResponse.json(
        { ok: false, error: "Tell us your name so we know who's asking." },
        { status: 400 }
      );
    }

    if ((await recentRequestCount(email)) >= MAX_PER_ADDRESS_PER_DAY) {
      // Not an error from the caller's point of view — they have already
      // asked, and asking again changes nothing. Say so kindly rather than
      // scolding them.
      return NextResponse.json({
        ok: true,
        alreadyAsked: true,
      });
    }

    await createAccessRequest({
      email,
      name,
      note: note || null,
      ip: ip === "unknown" ? null : ip,
    });

    // The alert never throws — a request that reached the database is not lost
    // because the email failed, and the dashboard shows it either way.
    await sendAccessRequestAlert({ email, name, note: note || null });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[academy] access request failed:", err);
    return NextResponse.json(
      {
        ok: false,
        error:
          "We couldn't record that just now. Please call 313-771-4400 instead.",
      },
      { status: 500 }
    );
  }
}
