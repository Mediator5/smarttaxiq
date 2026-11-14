import { NextResponse } from "next/server";
import { currentStudent } from "@/lib/academy/auth";
import { academyConfigured } from "@/lib/academy/store";
import {
  finalizeAttempt,
  liveAttempt,
  saveAnswer,
  startAttempt,
} from "@/lib/academy/exam-store";
import { paperForStudent } from "@/content/academy/exam";
import { expired, remainingMs } from "@/lib/academy/exam";

export const dynamic = "force-dynamic";

/**
 * The student's side of the exam: open the paper, save an answer, hand it in.
 *
 * Three rules hold this together, and all three live on this side of the
 * wire because none of them can be trusted to the browser:
 *
 *   1. The clock is the row's `expires_at`, written once when the paper was
 *      opened. Every request measures against it. A countdown edited in the
 *      console, a system clock wound back, a tab reopened on another
 *      machine — none of them move the deadline, and a save that arrives
 *      after it is refused rather than quietly dropped.
 *
 *   2. The student id comes from the session cookie, never from the body, so
 *      there is no id to tamper with and nobody can write into somebody
 *      else's paper.
 *
 *   3. No answer key is ever in a response. Parts A and B are marked here,
 *      on submit, against a module the browser has no way to reach; what the
 *      student is told at the end is which parts passed, not which questions
 *      were wrong. That is the paper's own practice: the marking sheet goes
 *      back within three days, from the instructor, with notes.
 */

export async function POST(request: Request) {
  try {
    if (!academyConfigured()) {
      return NextResponse.json(
        { ok: false, error: "The Academy isn't configured." },
        { status: 503 }
      );
    }

    const student = await currentStudent();
    if (!student) {
      return NextResponse.json(
        { ok: false, error: "Not signed in." },
        { status: 401 }
      );
    }

    const body = (await request.json().catch(() => null)) as Record<
      string,
      unknown
    > | null;
    const action = typeof body?.action === "string" ? body.action : "";

    /* ----------------------------------------------------------- start -- */
    if (action === "start") {
      const started = await startAttempt(student.id);

      if (!started.ok) {
        const status =
          started.reason === "no-release"
            ? 403
            : started.reason === "too-soon"
              ? 429
              : started.reason === "not-configured"
                ? 503
                : 409;
        return NextResponse.json(
          { ok: false, reason: started.reason, waitUntil: started.waitUntil },
          { status }
        );
      }

      const attempt = started.attempt;

      // A resumed attempt that had already run out comes back submitted.
      if (attempt.submitted_at) {
        return NextResponse.json({
          ok: true,
          state: "submitted",
          submittedAt: attempt.submitted_at,
          reason: attempt.submitted_reason,
        });
      }

      return NextResponse.json({
        ok: true,
        state: "sitting",
        attemptId: attempt.id,
        paper: paperForStudent(attempt.paper, attempt.parts),
        answers: attempt.answers ?? {},
        remainingMs: remainingMs(attempt.expires_at),
        expiresAt: attempt.expires_at,
        resumed: started.resumed,
      });
    }

    /* ------------------------------------------------------------ save -- */
    if (action === "save") {
      const questionId =
        typeof body?.questionId === "string" ? body.questionId.slice(0, 12) : "";
      const value = (body?.value ?? {}) as Record<string, unknown>;

      if (!/^[ABCD]\d{1,2}$/.test(questionId)) {
        return NextResponse.json(
          { ok: false, error: "Unknown question." },
          { status: 400 }
        );
      }

      const saved = await saveAnswer({
        studentId: student.id,
        questionId,
        value: {
          status: typeof value.status === "string" ? value.status : undefined,
          test: typeof value.test === "string" ? value.test : undefined,
          outcome: typeof value.outcome === "string" ? value.outcome : undefined,
          rule: typeof value.rule === "string" ? value.rule : undefined,
          text: typeof value.text === "string" ? value.text : undefined,
        },
      });

      if (!saved.ok) {
        // An expired save is not an error the student caused, and the page
        // needs to know to stop asking and show the result.
        return NextResponse.json(
          { ok: false, reason: saved.reason },
          { status: saved.reason === "expired" ? 410 : 409 }
        );
      }

      return NextResponse.json({ ok: true, remainingMs: saved.remainingMs });
    }

    /* ---------------------------------------------------------- submit -- */
    if (action === "submit") {
      const attempt = await liveAttempt(student.id);
      if (!attempt) {
        return NextResponse.json(
          { ok: false, error: "Nothing to hand in." },
          { status: 409 }
        );
      }

      // If the clock already ran out, record it as a time-out rather than a
      // hand-in: the sitting ended at the deadline, not when the button was
      // finally pressed.
      const closed = await finalizeAttempt(
        attempt.id,
        expired(attempt.expires_at) ? "time" : "student"
      );
      return NextResponse.json({
        ok: true,
        state: "submitted",
        submittedAt: closed?.submitted_at ?? new Date().toISOString(),
      });
    }

    /* ------------------------------------------------------------ ping -- */
    // The page asks for the time now and then rather than trusting its own
    // countdown to stay honest across a sleeping laptop.
    if (action === "time") {
      const attempt = await liveAttempt(student.id);
      if (!attempt) return NextResponse.json({ ok: true, remainingMs: 0 });
      return NextResponse.json({
        ok: true,
        remainingMs: remainingMs(attempt.expires_at),
      });
    }

    return NextResponse.json(
      { ok: false, error: "Unknown action." },
      { status: 400 }
    );
  } catch (err) {
    console.error("[academy] exam:", err);
    return NextResponse.json(
      { ok: false, error: "Something went wrong at our end." },
      { status: 500 }
    );
  }
}
