import { NextResponse } from "next/server";
import { currentStudent } from "@/lib/academy/auth";
import {
  academyConfigured,
  getAccessRequestById,
  markRequestHandled,
  setStudentStatus,
  upsertStudent,
} from "@/lib/academy/store";

export const dynamic = "force-dynamic";

/**
 * Roster management — the only privileged write endpoint in the Academy.
 *
 * Every action here is gated on the caller being an instructor, checked once
 * at the top against the database rather than anything in the request. The
 * session cookie carries an id; the roster decides what that id may do.
 *
 * One route with a discriminated `action` rather than four routes, because
 * they share that gate and splitting them would mean repeating it four times
 * — which is exactly the kind of duplication that eventually grows a version
 * that forgot to check.
 *
 * Note what "approve" does and does not do. It enrols the person and closes
 * the request. It does NOT email them, because at that point nobody has
 * verified they own that address — they will verify it themselves the first
 * time they sign in with a code. An access request is a claim, not proof.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

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
      // Same answer an ordinary visitor gets from /academy/roster: nothing
      // here confirms the endpoint exists.
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
    if (action === "add" || action === "approve") {
      const email = typeof body?.email === "string" ? body.email.trim() : "";
      const firstName =
        typeof body?.firstName === "string" ? body.firstName.trim() : "";
      const lastName =
        typeof body?.lastName === "string" ? body.lastName.trim() : "";
      const role = body?.role === "instructor" ? "instructor" : "student";
      const cohort =
        typeof body?.cohort === "string" && body.cohort.trim()
          ? body.cohort.trim()
          : viewer.cohort;

      if (!EMAIL_RE.test(email)) {
        return NextResponse.json(
          { ok: false, error: "That doesn't look like an email address." },
          { status: 400 }
        );
      }
      if (firstName.length < 1) {
        return NextResponse.json(
          { ok: false, error: "A first name is required." },
          { status: 400 }
        );
      }

      const student = await upsertStudent({
        email,
        firstName,
        lastName: lastName || null,
        role,
        cohort,
      });

      // Approving also closes the request that prompted it.
      if (action === "approve" && typeof body?.requestId === "string") {
        const req = await getAccessRequestById(body.requestId);
        if (req) await markRequestHandled(req.id);
      }

      return NextResponse.json({ ok: true, student });
    }

    /* --------------------------------------------------------- status -- */
    if (action === "withdraw" || action === "reactivate") {
      const id = typeof body?.id === "string" ? body.id : "";
      if (!id) {
        return NextResponse.json(
          { ok: false, error: "Which person?" },
          { status: 400 }
        );
      }
      if (id === viewer.id && action === "withdraw") {
        // Cheap guard against the instructor locking herself out of the only
        // page that could let her back in.
        return NextResponse.json(
          { ok: false, error: "You can't withdraw your own account." },
          { status: 400 }
        );
      }

      await setStudentStatus(id, action === "withdraw" ? "withdrawn" : "active");
      return NextResponse.json({ ok: true });
    }

    /* -------------------------------------------------------- dismiss -- */
    if (action === "dismiss") {
      const id = typeof body?.requestId === "string" ? body.requestId : "";
      if (!id) {
        return NextResponse.json(
          { ok: false, error: "Which request?" },
          { status: 400 }
        );
      }
      await markRequestHandled(id);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json(
      { ok: false, error: "Unknown action." },
      { status: 400 }
    );
  } catch (err) {
    console.error("[academy] roster write failed:", err);
    return NextResponse.json(
      { ok: false, error: "That didn't save. Try again in a moment." },
      { status: 500 }
    );
  }
}
