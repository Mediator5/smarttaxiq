import { NextResponse } from "next/server";
import { currentStudent } from "@/lib/academy/auth";
import { academyConfigured } from "@/lib/academy/store";
import {
  createRelease,
  markAttempt,
  recordPaperPass,
  restoreCertification,
  revokeCertification,
  revokeRelease,
  signedUrlForExamFile,
} from "@/lib/academy/exam-store";
import { ALL_PARTS, type ExamPart, type PaperId } from "@/content/academy/exam";

export const dynamic = "force-dynamic";

/**
 * The instructor's side of the exam.
 *
 * Same gate as /api/academy/roster and /api/academy/onboarding: the session
 * cookie carries an id, the roster decides what that id may do, and a trainee
 * gets 404 rather than 403 because there is no reason to confirm the endpoint
 * exists. Every action here either lets somebody sit the paper, records a
 * mark, or turns a pass into a certificate, and none of them should be
 * reachable by the people being examined.
 *
 * Marks arrive as a map of question id to number and are clamped against the
 * paper before they are stored, so a slipped keystroke cannot award 50 marks
 * for a three-mark question.
 */

const PAPERS: PaperId[] = ["A", "B"];

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
      return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });
    }

    const by = `${viewer.first_name} ${viewer.last_name ?? ""}`.trim() || viewer.email;

    const body = (await request.json().catch(() => null)) as Record<
      string,
      unknown
    > | null;
    const action = typeof body?.action === "string" ? body.action : "";

    /* --------------------------------------------------------- release -- */
    if (action === "release") {
      const studentId = typeof body?.studentId === "string" ? body.studentId : "";
      const paperRaw = typeof body?.paper === "string" ? body.paper : "A";
      const paper = PAPERS.includes(paperRaw as PaperId)
        ? (paperRaw as PaperId)
        : "A";

      const requested = Array.isArray(body?.parts)
        ? (body.parts as unknown[]).filter(
            (p): p is ExamPart => typeof p === "string" && ALL_PARTS.includes(p as ExamPart)
          )
        : ALL_PARTS;

      if (!studentId) {
        return NextResponse.json(
          { ok: false, error: "Which student?" },
          { status: 400 }
        );
      }
      if (requested.length === 0) {
        return NextResponse.json(
          { ok: false, error: "Choose at least one part." },
          { status: 400 }
        );
      }

      const release = await createRelease({
        studentId,
        paper,
        parts: requested,
        by,
        note: typeof body?.note === "string" ? body.note : null,
      });

      return NextResponse.json({ ok: true, release });
    }

    /* ---------------------------------------------------------- revoke -- */
    if (action === "revoke-release") {
      const id = typeof body?.releaseId === "string" ? body.releaseId : "";
      if (!id) {
        return NextResponse.json({ ok: false, error: "Which release?" }, { status: 400 });
      }
      await revokeRelease(id, by);
      return NextResponse.json({ ok: true });
    }

    /* ------------------------------------------------------------ mark -- */
    if (action === "mark") {
      const attemptId = typeof body?.attemptId === "string" ? body.attemptId : "";
      const rawMarks = (body?.marks ?? {}) as Record<string, unknown>;

      if (!attemptId) {
        return NextResponse.json({ ok: false, error: "Which paper?" }, { status: 400 });
      }

      const marks: Record<string, number> = {};
      for (const [qid, value] of Object.entries(rawMarks)) {
        if (!/^[CD]\d{1,2}$/.test(qid)) continue;
        const n = typeof value === "number" ? value : Number(value);
        if (!Number.isFinite(n)) continue;
        marks[qid] = n;
      }

      const attempt = await markAttempt({
        attemptId,
        marks,
        notes: typeof body?.notes === "string" ? body.notes : null,
        by,
      });

      if (!attempt) {
        return NextResponse.json({ ok: false, error: "No such paper." }, { status: 404 });
      }

      return NextResponse.json({
        ok: true,
        result: attempt.result,
        failedParts: attempt.failed_parts,
        partTotals: attempt.part_totals,
      });
    }

    /* ---------------------------------------------------- paper sitting -- */
    if (action === "record-paper-pass") {
      const studentId = typeof body?.studentId === "string" ? body.studentId : "";
      if (!studentId) {
        return NextResponse.json({ ok: false, error: "Which student?" }, { status: 400 });
      }
      const cert = await recordPaperPass({ studentId, by });
      return NextResponse.json({ ok: true, certification: cert });
    }

    if (action === "revoke-certificate") {
      const studentId = typeof body?.studentId === "string" ? body.studentId : "";
      if (!studentId) {
        return NextResponse.json({ ok: false, error: "Which student?" }, { status: 400 });
      }
      await revokeCertification(studentId, by);
      return NextResponse.json({ ok: true });
    }

    if (action === "restore-certificate") {
      const studentId = typeof body?.studentId === "string" ? body.studentId : "";
      if (!studentId) {
        return NextResponse.json({ ok: false, error: "Which student?" }, { status: 400 });
      }
      await restoreCertification(studentId);
      return NextResponse.json({ ok: true });
    }

    /* ------------------------------------------------------ attachment -- */
    if (action === "file-url") {
      const fileId = typeof body?.fileId === "string" ? body.fileId : "";
      if (!fileId) {
        return NextResponse.json({ ok: false, error: "Which file?" }, { status: 400 });
      }
      const signed = await signedUrlForExamFile(fileId);
      if (!signed) {
        return NextResponse.json({ ok: false, error: "That file is gone." }, { status: 404 });
      }
      return NextResponse.json({ ok: true, ...signed });
    }

    return NextResponse.json({ ok: false, error: "Unknown action." }, { status: 400 });
  } catch (err) {
    console.error("[academy] exam manage:", err);
    const message =
      err instanceof Error && /has not been handed in/.test(err.message)
        ? err.message
        : "Something went wrong at our end.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
