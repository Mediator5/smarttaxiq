import { NextResponse } from "next/server";
import { verifyCode } from "@/lib/academy/auth";

export const dynamic = "force-dynamic";

/**
 * Step two: exchange the emailed code for a session cookie.
 *
 * Guess-rate is limited in two places and both matter. Per code, in the
 * database: five wrong attempts kills that code, so six digits cannot be
 * walked through. Per IP, here: a burst from one address is stopped before it
 * gets as far as the database. The in-memory counter is honest about its
 * limits — serverless instances do not share memory, so it thins a flood
 * rather than sealing the door. The per-code counter is the real lock.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

const hits = new Map<string, number[]>();
function rateLimited(ip: string) {
  const now = Date.now();
  const win = 10 * 60 * 1000;
  const list = (hits.get(ip) || []).filter((t) => now - t < win);
  list.push(now);
  hits.set(ip, list);
  if (hits.size > 5000) hits.clear();
  return list.length > 12;
}

export async function POST(request: Request) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
    if (rateLimited(ip)) {
      return NextResponse.json(
        {
          ok: false,
          error: "Too many attempts. Wait ten minutes and ask for a new code.",
        },
        { status: 429 }
      );
    }

    const body = (await request.json().catch(() => null)) as {
      email?: unknown;
      code?: unknown;
    } | null;

    const email = typeof body?.email === "string" ? body.email.trim() : "";
    const code =
      typeof body?.code === "string" ? body.code.replace(/\D/g, "") : "";

    if (!EMAIL_RE.test(email) || code.length !== 6) {
      return NextResponse.json(
        { ok: false, error: "Enter the six-digit code from the email." },
        { status: 400 }
      );
    }

    const result = await verifyCode(email, code);

    if (!result.ok) {
      const message =
        result.reason === "expired"
          ? "That code has expired. Ask for a new one."
          : result.reason === "locked"
          ? "Too many wrong attempts on that code. Ask for a new one."
          : result.reason === "not-configured"
          ? "The Academy isn't finished being set up. Tell your trainer."
          : "That code doesn't match. Check the email and try again.";

      return NextResponse.json(
        { ok: false, error: message },
        { status: result.reason === "not-configured" ? 503 : 401 }
      );
    }

    return NextResponse.json({
      ok: true,
      firstName: result.student.first_name,
      role: result.student.role,
    });
  } catch (err) {
    console.error("[academy] verify-code failed:", err);
    return NextResponse.json(
      { ok: false, error: "Something went wrong. Try again in a moment." },
      { status: 500 }
    );
  }
}
