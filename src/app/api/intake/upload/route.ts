import { NextResponse } from "next/server";
import {
  ALLOWED_UPLOAD_TYPES,
  MAX_UPLOAD_BYTES,
  academyConfigured,
  findByIntakeToken,
  listFilesFor,
  saveOnboardingFile,
  sniffUpload,
  type UploadKind,
} from "@/lib/academy/store";

export const dynamic = "force-dynamic";
// A 10 MB photo of a driver's licence is a perfectly ordinary thing to send
// from a phone, and the default body limit would reject it.
export const maxDuration = 60;

/**
 * The preparer uploading a document from their own onboarding link.
 *
 * Like the sibling route, this is unauthenticated in the sense that there is
 * no session — and like that route, the token is a 256-bit secret checked
 * against a stored hash, and the row id comes from the token rather than from
 * the request. A valid token can write files to exactly one preparer's record
 * and no other.
 *
 * What arrives here is a W-9 or a driver's licence, so the checks are stricter
 * than the usual "is this a picture":
 *
 *   - the declared content type must be one we accept, AND
 *   - the actual first bytes of the file must agree with it.
 *
 * A browser's `file.type` is a label, not a fact. The sniff is the fact.
 */

const KINDS: UploadKind[] = ["w9", "id", "other"];

export async function POST(request: Request) {
  try {
    if (!academyConfigured()) {
      return NextResponse.json(
        { ok: false, error: "Not available right now." },
        { status: 503 }
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

    const token = String(form.get("token") ?? "");
    const person = await findByIntakeToken(token);
    if (!person) {
      return NextResponse.json(
        { ok: false, error: "This link is not valid." },
        { status: 404 }
      );
    }
    if (person.expired) {
      return NextResponse.json(
        { ok: false, error: "This link has expired. Ask us for a fresh one." },
        { status: 410 }
      );
    }

    const kindRaw = String(form.get("kind") ?? "");
    const kind = KINDS.includes(kindRaw as UploadKind)
      ? (kindRaw as UploadKind)
      : null;
    if (!kind) {
      return NextResponse.json(
        { ok: false, error: "Unknown document type." },
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
        {
          ok: false,
          error:
            "That file is too big to send. Photograph the document instead of attaching a large scan.",
        },
        { status: 413 }
      );
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const sniffed = sniffUpload(bytes);
    const declared = file.type?.toLowerCase() ?? "";

    if (!sniffed || !ALLOWED_UPLOAD_TYPES[sniffed]) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "That has to be a PDF or a photo (JPG, PNG, HEIC). Nothing else goes through.",
        },
        { status: 415 }
      );
    }

    // The sniff is what gets stored and what the file is later served as, so
    // a mismatched label is not itself dangerous. It is still worth refusing:
    // the only way to send a PDF labelled image/png is on purpose. HEIC and
    // HEIF are one container that browsers name two ways, so they match.
    const same = (a: string, b: string) =>
      a === b ||
      (a === "image/heic" && b === "image/heif") ||
      (a === "image/heif" && b === "image/heic");

    if (declared && ALLOWED_UPLOAD_TYPES[declared] && !same(sniffed, declared)) {
      return NextResponse.json(
        { ok: false, error: "That file did not look like what it said it was." },
        { status: 415 }
      );
    }

    const label =
      kind === "other" ? String(form.get("label") ?? "").slice(0, 80) : null;

    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

    const saved = await saveOnboardingFile({
      onboardingId: person.id,
      kind,
      label,
      fileName: file.name || "document",
      mimeType: sniffed,
      bytes,
      ip,
    });

    return NextResponse.json({ ok: true, file: saved });
  } catch (err) {
    console.error("[academy] intake upload failed:", err);
    return NextResponse.json(
      { ok: false, error: "That didn't upload. Try again in a moment." },
      { status: 500 }
    );
  }
}

/** The files already attached to this link, so the page can show them after a
 *  reload without the preparer wondering whether the first one worked. */
export async function GET(request: Request) {
  try {
    if (!academyConfigured()) return NextResponse.json({ ok: true, files: [] });

    const token = new URL(request.url).searchParams.get("token") ?? "";
    const person = await findByIntakeToken(token);
    if (!person || person.expired) {
      return NextResponse.json({ ok: false, files: [] }, { status: 404 });
    }

    return NextResponse.json({ ok: true, files: await listFilesFor(person.id) });
  } catch (err) {
    console.error("[academy] intake file list failed:", err);
    return NextResponse.json({ ok: false, files: [] }, { status: 500 });
  }
}
