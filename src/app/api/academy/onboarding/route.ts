import { NextResponse } from "next/server";
import { currentStudent } from "@/lib/academy/auth";
import {
  academyConfigured,
  getOnboarding,
  saveOnboarding,
  setOnboardingArchived,
  upsertOnboarding,
} from "@/lib/academy/store";

export const dynamic = "force-dynamic";

/**
 * Preparer onboarding — the compliance checklist's only write endpoint.
 *
 * Same shape and same gate as /api/academy/roster: one route, a discriminated
 * `action`, and the instructor check done once at the top against the
 * database rather than against anything in the request. The session cookie
 * carries an id; the roster decides what that id may do. A trainee gets 404,
 * not 403, because there is no reason to confirm this endpoint exists.
 *
 * Nothing sensitive passes through here. The only free-text fields are a
 * name, an email, a PTIN and a note. There is no file upload, no SSN and no
 * document reference anywhere in the payload — see the comment above
 * academy_onboarding in supabase/academy.sql for why that is the whole point.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;
// A PTIN is the letter P and eight digits. Checking the shape catches a typo
// before it is recorded as verified; it does not prove the PTIN is real, which
// is what the IRS directory lookup is for.
const PTIN_RE = /^[Pp]\d{8}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const CHECKS = [
  "ptin_verified_at",
  "w9_received_at",
  "id_sighted_at",
  "security_plan_signed_at",
] as const;

type CheckField = (typeof CHECKS)[number];

export async function POST(request: Request) {
  try {
    if (!academyConfigured()) {
      return NextResponse.json(
        { ok: false, error: "The Academy isn't configured." },
        { status: 503 }
      );
    }

    const viewer = await currentStudent();
    if (!viewer || viewer.role !== "instructor") {
      return NextResponse.json(
        { ok: false, error: "Not found." },
        { status: 404 }
      );
    }

    const body = (await request.json().catch(() => null)) as Record<
      string,
      unknown
    > | null;
    const action = typeof body?.action === "string" ? body.action : "";

    /* ------------------------------------------------------------ add -- */
    if (action === "add") {
      const email = typeof body?.email === "string" ? body.email.trim() : "";
      const firstName =
        typeof body?.firstName === "string" ? body.firstName.trim() : "";
      const lastName =
        typeof body?.lastName === "string" ? body.lastName.trim() : "";

      if (!EMAIL_RE.test(email)) {
        return NextResponse.json(
          { ok: false, error: "That doesn't look like an email address." },
          { status: 400 }
        );
      }
      if (!firstName) {
        return NextResponse.json(
          { ok: false, error: "A first name is required." },
          { status: 400 }
        );
      }

      const row = await upsertOnboarding({
        email,
        firstName,
        lastName: lastName || null,
      });
      return NextResponse.json({ ok: true, row });
    }

    /* ----------------------------------------------------------- save -- */
    if (action === "save") {
      const id = typeof body?.id === "string" ? body.id : "";
      if (!id) {
        return NextResponse.json(
          { ok: false, error: "Which person?" },
          { status: 400 }
        );
      }

      // Build the patch from what was actually sent. A key that is absent is
      // left alone; a key sent as null is cleared, which is how a box gets
      // un-ticked. `undefined` and `null` therefore mean different things and
      // the distinction is load-bearing.
      const patch: Parameters<typeof saveOnboarding>[1] = {};

      if ("ptin" in (body ?? {})) {
        const raw = typeof body?.ptin === "string" ? body.ptin.trim() : "";
        if (raw && !PTIN_RE.test(raw)) {
          return NextResponse.json(
            {
              ok: false,
              error: "A PTIN is the letter P followed by eight digits.",
            },
            { status: 400 }
          );
        }
        patch.ptin = raw ? raw.toUpperCase() : null;
      }

      for (const field of CHECKS) {
        if (!(field in (body ?? {}))) continue;
        const value = body?.[field];
        if (value === null || value === "") {
          patch[field as CheckField] = null;
          continue;
        }
        if (typeof value !== "string" || !DATE_RE.test(value)) {
          return NextResponse.json(
            { ok: false, error: "That date didn't make sense." },
            { status: 400 }
          );
        }
        patch[field as CheckField] = value;
      }

      if ("notes" in (body ?? {})) {
        const raw = typeof body?.notes === "string" ? body.notes.trim() : "";
        patch.notes = raw ? raw.slice(0, 2000) : null;
      }

      if (Object.keys(patch).length === 0) {
        return NextResponse.json(
          { ok: false, error: "Nothing to save." },
          { status: 400 }
        );
      }

      // Ticking a PTIN box with no PTIN recorded is a record of nothing.
      if (patch.ptin_verified_at) {
        const rows = await getOnboarding();
        const row = rows.find((r) => r.id === id);
        const ptin = "ptin" in patch ? patch.ptin : row?.ptin;
        if (!ptin) {
          return NextResponse.json(
            {
              ok: false,
              error: "Record the PTIN number before marking it verified.",
            },
            { status: 400 }
          );
        }
      }

      const row = await saveOnboarding(id, patch, viewer.id);
      return NextResponse.json({ ok: true, row });
    }

    /* -------------------------------------------------------- archive -- */
    if (action === "archive" || action === "restore") {
      const id = typeof body?.id === "string" ? body.id : "";
      if (!id) {
        return NextResponse.json(
          { ok: false, error: "Which person?" },
          { status: 400 }
        );
      }
      await setOnboardingArchived(id, action === "archive");
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json(
      { ok: false, error: "Unknown action." },
      { status: 400 }
    );
  } catch (err) {
    console.error("[academy] onboarding write failed:", err);
    return NextResponse.json(
      { ok: false, error: "That didn't save. Try again in a moment." },
      { status: 500 }
    );
  }
}
