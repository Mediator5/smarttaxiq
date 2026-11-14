import { NextResponse } from "next/server";
import { currentStudent } from "@/lib/academy/auth";
import {
  ALLOWED_UPLOAD_TYPES,
  MAX_UPLOAD_BYTES,
  academyConfigured,
  sniffUpload,
} from "@/lib/academy/store";
import { liveAttempt, saveExamFile } from "@/lib/academy/exam-store";
import { expired } from "@/lib/academy/exam";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Part C attachments.
 *
 * Part C asks for a complete return, and a student working on screen may well
 * prepare it in the software and want to hand in what came out — a PDF, or a
 * photograph of the worksheet. The answer boxes still carry the marks; this
 * is the evidence beside them.
 *
 * Same file discipline as every other upload in this codebase: the declared
 * type must be one we accept and the first bytes of the file must agree with
 * it, because `file.type` is a label and the signature is a fact. The bucket
 * is private and the only way back out is a sixty-second signed URL minted
 * for an instructor.
 *
 * And the same clock: an attachment arriving after the two hours is refused,
 * for the same reason a late answer is.
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

    const attempt = await liveAttempt(student.id);
    if (!attempt) {
      return NextResponse.json(
        { ok: false, error: "You do not have a paper open." },
        { status: 409 }
      );
    }
    if (expired(attempt.expires_at)) {
      return NextResponse.json(
        { ok: false, reason: "expired", error: "Your time is up." },
        { status: 410 }
      );
    }
    if (!attempt.parts.includes("C")) {
      return NextResponse.json(
        { ok: false, error: "This sitting does not include Part C." },
        { status: 400 }
      );
    }

    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      return NextResponse.json(
        { ok: false, error: "That upload did not arrive in one piece." },
        { status: 400 }
      );
    }

    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json(
        { ok: false, error: "Choose a file first." },
        { status: 400 }
      );
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { ok: false, error: "That file is larger than 4 MB." },
        { status: 413 }
      );
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const sniffed = sniffUpload(bytes);
    const ext = sniffed ? ALLOWED_UPLOAD_TYPES[sniffed] : null;

    if (!sniffed || !ext || sniffed !== file.type) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Send a PDF or a photo. If that is what this is, try exporting it again.",
        },
        { status: 415 }
      );
    }

    const questionRaw = String(form.get("questionId") ?? "");
    const questionId = /^C\d{1,2}$/.test(questionRaw) ? questionRaw : null;

    const saved = await saveExamFile({
      attemptId: attempt.id,
      questionId,
      fileName: file.name,
      mimeType: sniffed,
      ext,
      bytes,
      ip:
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    });

    return NextResponse.json({
      ok: true,
      file: {
        id: saved.id,
        fileName: saved.file_name,
        sizeBytes: saved.size_bytes,
        questionId: saved.question_id,
      },
    });
  } catch (err) {
    const message =
      err instanceof Error && /as many attachments/.test(err.message)
        ? err.message
        : "Something went wrong at our end.";
    console.error("[academy] exam upload:", err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
