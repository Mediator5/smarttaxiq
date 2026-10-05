import { NextResponse } from "next/server";
import {
  academyConfigured,
  completeIntake,
  findByIntakeToken,
} from "@/lib/academy/store";

export const dynamic = "force-dynamic";

/**
 * The preparer's submission. The only unauthenticated write in the Academy.
 *
 * It is unauthenticated in the sense that there is no session — but the token
 * is a 256-bit secret that only reaches one person's inbox, and it is checked
 * here against the stored hash rather than trusted from the request. The id is
 * taken from the row the token resolves to and never from the body, so there
 * is nothing to tamper with: a valid token can only ever write to its own row.
 *
 * What it will not write is the point. `ptin_verified_at`, `id_sighted_at` and
 * `w9_received_at` are untouched, because those are the instructor's
 * statements about what she checked. A self-service form that could tick a
 * verification box would turn the whole checklist into decoration.
 */

const PTIN_RE = /^[Pp]\d{8}$/;

export async function POST(request: Request) {
  try {
    if (!academyConfigured()) {
      return NextResponse.json(
        { ok: false, error: "Not available right now." },
        { status: 503 }
      );
    }

    const body = (await request.json().catch(() => null)) as Record<
      string,
      unknown
    > | null;

    const token = typeof body?.token === "string" ? body.token : "";
    const person = await findByIntakeToken(token);
    if (!person) {
      return NextResponse.json(
        { ok: false, error: "This link is not valid." },
        { status: 404 }
      );
    }
    if (person.expired) {
      return NextResponse.json(
        {
          ok: false,
          error: "This link has expired. Ask us for a fresh one.",
        },
        { status: 410 }
      );
    }
    if (person.intake_completed_at) {
      // Already done. Not an error worth alarming anybody about — reloading
      // the page shows them the completed state.
      return NextResponse.json({ ok: true, alreadyDone: true });
    }

    const raw = typeof body?.ptin === "string" ? body.ptin.trim() : "";
    if (raw && !PTIN_RE.test(raw)) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "A PTIN is the letter P followed by eight digits, like P01234567.",
        },
        { status: 400 }
      );
    }

    const signedName =
      typeof body?.signedName === "string" ? body.signedName.trim() : "";
    if (!/^\S{2,}(\s+\S{2,})+$/.test(signedName)) {
      return NextResponse.json(
        { ok: false, error: "Please sign with your full name." },
        { status: 400 }
      );
    }

    // First hop only. x-forwarded-for is a client-controllable header, so this
    // is evidence of a signature rather than proof of one — which is exactly
    // what a typed signature is anyway.
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

    await completeIntake({
      id: person.id,
      ptin: raw ? raw.toUpperCase() : null,
      signedName,
      ip,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[academy] intake submission failed:", err);
    return NextResponse.json(
      { ok: false, error: "That didn't send. Try again in a moment." },
      { status: 500 }
    );
  }
}
