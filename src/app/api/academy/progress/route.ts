import { NextResponse } from "next/server";
import { currentStudent } from "@/lib/academy/auth";
import { recordAttempt, touchStudent } from "@/lib/academy/store";
import { PASS_MARK, quizModules } from "@/content/academy/modules";

export const dynamic = "force-dynamic";

/**
 * Record one attempt at a knowledge check.
 *
 * The student id comes from the session cookie and never from the request
 * body, so a signed-in student can only ever write their own progress and
 * there is no id to tamper with. The pass mark is recomputed here from the
 * submitted score rather than trusted, because `passed` arriving as `true`
 * from a browser is a claim, not a fact.
 *
 * The score itself is still self-reported — the answer key is in the page, as
 * it must be for instant feedback, so anyone determined to send a 100 can. We
 * are not defending against that. This is a training course for five people
 * who are being hired on the strength of a supervised written exam in
 * December, and a student who fakes a knowledge-check score has only cheated
 * themselves out of the practice. The marks that decide anything are marked
 * on paper, by a human.
 */

export async function POST(request: Request) {
  try {
    const student = await currentStudent();
    if (!student) {
      return NextResponse.json(
        { ok: false, error: "Not signed in." },
        { status: 401 }
      );
    }

    const body = (await request.json().catch(() => null)) as {
      moduleIdx?: unknown;
      score?: unknown;
    } | null;

    const moduleIdx = Number(body?.moduleIdx);
    const score = Number(body?.score);

    const known = quizModules.some((m) => m.idx === moduleIdx);
    if (!known || !Number.isFinite(score) || score < 0 || score > 100) {
      return NextResponse.json(
        { ok: false, error: "Bad module or score." },
        { status: 400 }
      );
    }

    const row = await recordAttempt({
      studentId: student.id,
      moduleIdx,
      score,
      passed: score >= PASS_MARK,
    });

    void touchStudent(student.id);

    return NextResponse.json({ ok: true, progress: row });
  } catch (err) {
    console.error("[academy] progress write failed:", err);
    // The student has their result on screen either way. Tell them plainly
    // that it did not save rather than letting them believe it did.
    return NextResponse.json(
      { ok: false, error: "Your score didn't save. Try the check again." },
      { status: 500 }
    );
  }
}
