import { NextResponse } from "next/server";
import { requestCode } from "@/lib/academy/auth";

export const dynamic = "force-dynamic";

/**
 * Step one of signing in: send a one-time code to an enrolled address.
 *
 * This endpoint DOES say when an address is not on the roster. The earlier
 * version stayed silent so it could not be used to ask who trains here, and
 * that traded a small privacy gain for a large usability loss — a student who
 * mistypes their own email waits forever on a page that says everything is
 * fine. See the note above requestCode() in lib/academy/auth.ts.
 *
 * The enumeration risk moves here instead. A per-IP limit means the endpoint
 * cannot be walked through a list of addresses. It is in-memory and therefore
 * honest about its limits — serverless instances do not share memory, so it
 * thins a flood rather than sealing the door — but combined with a roster of
 * five people it is proportionate to what is actually behind it.
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
  return list.length > 10;
}

export async function POST(request: Request) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";

    if (rateLimited(ip)) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Too many attempts from this connection. Wait ten minutes and try again.",
        },
        { status: 429 }
      );
    }

    const body = (await request.json().catch(() => null)) as {
      email?: unknown;
    } | null;

    const email = typeof body?.email === "string" ? body.email.trim() : "";
    if (!EMAIL_RE.test(email)) {
      return NextResponse.json(
        { ok: false, error: "Enter the email address you enrolled with." },
        { status: 400 }
      );
    }

    const result = await requestCode(email, ip === "unknown" ? null : ip);

    if (!result.ok) {
      if (result.reason === "not-enrolled") {
        // `notEnrolled` lets the form offer the "ask to be added" step rather
        // than leaving someone at a dead end.
        return NextResponse.json(
          {
            ok: false,
            notEnrolled: true,
            error:
              "That address isn't on the Academy roster, so no code has been sent.",
          },
          { status: 404 }
        );
      }
      if (result.reason === "throttled") {
        return NextResponse.json(
          {
            ok: false,
            error:
              "That's several codes in a short time. Wait a few minutes, then try again — and check your spam folder in the meantime.",
          },
          { status: 429 }
        );
      }
      if (result.reason === "not-configured") {
        return NextResponse.json(
          {
            ok: false,
            error:
              "The Academy isn't finished being set up. Tell your trainer — this one is on us, not you.",
          },
          { status: 503 }
        );
      }
      return NextResponse.json(
        {
          ok: false,
          error:
            "We couldn't send the code just now. Try again in a minute, and call the office if it keeps happening.",
        },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[academy] request-code failed:", err);
    return NextResponse.json(
      { ok: false, error: "Something went wrong. Try again in a moment." },
      { status: 500 }
    );
  }
}
