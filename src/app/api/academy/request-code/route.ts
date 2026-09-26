import { NextResponse } from "next/server";
import { requestCode } from "@/lib/academy/auth";

export const dynamic = "force-dynamic";

/**
 * Step one of signing in: send a one-time code to an enrolled address.
 *
 * This endpoint tells the caller almost nothing. An address on the roster and
 * an address that has never been heard of both come back `{ ok: true }`,
 * because the alternative turns a public URL into a way of asking whether any
 * given person is training here. The only failures it does report are ones
 * the caller can act on — too many requests, or the site not being set up.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

export async function POST(request: Request) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0].trim() || null;

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

    const result = await requestCode(email, ip);

    if (!result.ok) {
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
