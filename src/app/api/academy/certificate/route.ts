import { currentStudent } from "@/lib/academy/auth";
import { academyConfigured, findStudentById } from "@/lib/academy/store";
import { certificationFor } from "@/lib/academy/exam-store";
import { certificateFileName, certificatePdf } from "@/lib/academy/certificate";
import { site } from "@/lib/site";
import type { PartStanding } from "@/lib/academy/exam";

export const dynamic = "force-dynamic";

/**
 * The certificate, as a PDF download.
 *
 * Generated on the fly rather than stored, because there is nothing to store:
 * the name comes from the roster, the date and the number come from the
 * certification row, and the row is the only thing that decides whether this
 * route answers at all. No row, no certificate — a score alone never produces
 * one, and a revoked pass stops serving immediately rather than leaving a
 * file sitting in a bucket.
 *
 * A student gets their own and nobody else's. An instructor may fetch anyone's,
 * which is how a certificate gets re-sent to somebody who lost theirs.
 */

export async function GET(request: Request) {
  if (!academyConfigured()) {
    return new Response("Not available.", { status: 503 });
  }

  const viewer = await currentStudent();
  if (!viewer) return new Response("Not signed in.", { status: 401 });

  const url = new URL(request.url);
  const asked = url.searchParams.get("student");

  // Only an instructor may name somebody else.
  const subjectId =
    asked && viewer.role === "instructor" ? asked : viewer.id;

  const subject =
    subjectId === viewer.id ? viewer : await findStudentById(subjectId);

  if (!subject) return new Response("Not found.", { status: 404 });

  const cert = await certificationFor(subject.id);
  if (!cert || cert.revoked_at) {
    return new Response("Not found.", { status: 404 });
  }

  // part_totals is the standing at the moment of certification: each part at
  // its best across every sitting. A paper sitting has none, and the
  // certificate simply omits the line.
  const standing = Array.isArray(cert.part_totals)
    ? (cert.part_totals as PartStanding[])
    : [];

  const parts = standing
    .filter((p) => p?.best)
    .map((p) => ({
      part: p.part,
      awarded: p.best!.awarded,
      available: p.best!.available,
    }));

  const name = `${subject.first_name} ${subject.last_name ?? ""}`.trim();

  const pdf = certificatePdf({
    name,
    cohort: subject.cohort,
    certificateNo: cert.certificate_no,
    passedAt: new Date(cert.passed_at),
    parts: parts.length === 4 ? parts : undefined,
    instructor: site.preparer.name,
  });

  return new Response(pdf as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${certificateFileName(name)}"`,
      "Content-Length": String(pdf.length),
      // A certificate is not a page to cache on the way through.
      "Cache-Control": "private, no-store",
    },
  });
}
