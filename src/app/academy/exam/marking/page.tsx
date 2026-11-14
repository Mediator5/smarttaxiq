import { notFound } from "next/navigation";
import AcademyNav from "@/components/academy/AcademyNav";
import StaffSignIn from "@/components/academy/StaffSignIn";
import { currentStudent, sessionSecretConfigured } from "@/lib/academy/auth";
import { academyConfigured } from "@/lib/academy/store";
import {
  examRoster,
  listExamFiles,
  markingQueue,
} from "@/lib/academy/exam-store";
import { partTotals, standing } from "@/lib/academy/exam";
import {
  EXAM_WINDOW,
  PART_SPECS,
  paper as getPaper,
  type ExamPart,
} from "@/content/academy/exam";
import { KEYS, MARKING_PRINCIPLES, PART_C_DEDUCTIONS } from "@/content/academy/exam-key";
import ExamMarking, {
  type MarkingPaper,
  type RosterRow,
} from "@/components/academy/ExamMarking";

/**
 * Marking, releasing, and the certificate record.
 *
 * Instructor only, and gated the same way as every other staff page: a 404
 * for a signed-in trainee, the staff sign-in form for a visitor who is not
 * signed in at all.
 *
 * This is the one page in the Academy that deliberately puts the answer key
 * in a browser. It has to: marking a written answer against a model answer
 * means both being on screen at once, and the alternative is Lashanda holding
 * an 18-page PDF open beside the laptop and losing her place. The role check
 * above is what makes it safe, and it is the same check that guards the
 * instructor materials.
 */
export const dynamic = "force-dynamic";

export default async function ExamMarkingPage() {
  if (!academyConfigured() || !sessionSecretConfigured()) notFound();

  const viewer = await currentStudent();
  if (!viewer) return <StaffSignIn area="exam marking" />;
  if (viewer.role !== "instructor") notFound();

  const [queue, roster] = await Promise.all([markingQueue(), examRoster()]);

  /* Build one packet per handed-in paper: the student's answers, the model
     answers beside them, and whatever marks already exist. */
  const papers: MarkingPaper[] = [];

  for (const attempt of queue) {
    const p = getPaper(attempt.paper);
    const key = KEYS[attempt.paper];
    const totals = partTotals(
      attempt.paper,
      attempt.parts,
      attempt.auto_marks,
      attempt.marks
    );

    const written: MarkingPaper["written"] = [];

    if (attempt.parts.includes("C")) {
      for (const q of p.c.questions) {
        written.push({
          part: "C",
          id: q.id,
          marks: q.marks,
          prompt: q.prompt,
          hint: q.hint ?? null,
          answer: attempt.answers?.[q.id]?.text ?? "",
          model: key.c[q.id]?.answer ?? "",
          awards: key.c[q.id]?.awards ?? "",
          mark: attempt.marks?.[q.id] ?? null,
        });
      }
    }

    if (attempt.parts.includes("D")) {
      for (const q of p.d) {
        written.push({
          part: "D",
          id: q.id,
          marks: q.marks,
          prompt: q.prompt,
          hint: q.hint ?? null,
          answer: attempt.answers?.[q.id]?.text ?? "",
          model: key.d[q.id]?.answer ?? "",
          awards: key.d[q.id]?.awards ?? "",
          mark: attempt.marks?.[q.id] ?? null,
        });
      }
    }

    // Per-question detail for the parts the server already marked, so a
    // student's weak answers are visible rather than only the part total.
    const auto: MarkingPaper["auto"] = [];
    for (const part of ["A", "B"] as ExamPart[]) {
      if (!attempt.parts.includes(part)) continue;
      const pool = part === "A" ? p.a : p.b;
      for (const q of pool) {
        const given = attempt.answers?.[q.id] ?? {};
        const note = part === "A" ? key.a[q.id]?.note : key.b[q.id]?.note;
        auto.push({
          part,
          id: q.id,
          marks: q.marks,
          awarded: attempt.auto_marks?.[q.id] ?? 0,
          facts: part === "A" ? (q as { facts: string }).facts : (q as { facts: string }).facts,
          note: note ?? "",
          gave:
            part === "A"
              ? [given.status ?? "—", given.test ?? "—"].join(" · ")
              : [given.outcome ?? "—", given.rule ?? "—"].join(" · "),
        });
      }
    }

    const files = await listExamFiles(attempt.id);

    papers.push({
      attemptId: attempt.id,
      studentName:
        `${attempt.student?.first_name ?? ""} ${attempt.student?.last_name ?? ""}`.trim() ||
        attempt.student?.email ||
        "Unknown",
      paper: attempt.paper,
      parts: attempt.parts,
      submittedAt: attempt.submitted_at!,
      ranOutOfTime: attempt.submitted_reason === "time",
      totals,
      auto,
      written,
      files: files.map((f) => ({ id: f.id, fileName: f.file_name })),
      notes: attempt.marker_notes ?? "",
      result: attempt.result,
      markedAt: attempt.marked_at,
    });
  }

  const rosterRows: RosterRow[] = roster
    .filter((row) => row.student.role === "student")
    .map((row) => {
      const where = standing(row.attempts);
      return {
        studentId: row.student.id,
        name:
          `${row.student.first_name} ${row.student.last_name ?? ""}`.trim() ||
          row.student.email,
        email: row.student.email,
        cohort: row.student.cohort,
        sittings: row.attempts.filter((a) => a.submitted_at).length,
        failedParts: where.failedParts,
        passedAll: where.passed,
        awaitingMarking: where.awaitingMarking,
        release: row.release
          ? { id: row.release.id, paper: row.release.paper, parts: row.release.parts }
          : null,
        certificate: row.certification
          ? {
              number: row.certification.certificate_no,
              route: row.certification.route,
              passedAt: row.certification.passed_at,
              revoked: Boolean(row.certification.revoked_at),
            }
          : null,
      };
    });

  return (
    <section className="py-10 sm:py-14">
      <div className="shell">
        <div className="mb-8 flex flex-wrap items-baseline justify-between gap-4 border-b border-ink/10 pb-6">
          <div>
            <span className="eyebrow">Sat {EXAM_WINDOW}</span>
            <h1 className="mt-2 text-[30px] leading-[1.1]">Exam marking</h1>
          </div>
          <AcademyNav role={viewer.role} />
        </div>

        <p className="max-w-[72ch] text-[15.5px] leading-relaxed text-ink/70">
          Parts A and B are already marked — {PART_SPECS.A.marks + PART_SPECS.B.marks}{" "}
          of the 100 marks, against the key. What is left is Part C, the
          complete return, and Part D, the five ethics answers. Both are shown
          beside the model answer and the mark breakdown. Enter a mark per
          question and the result works itself out; a pass on all four parts
          writes the certificate the same minute.
        </p>

        <ExamMarking
          papers={papers}
          roster={rosterRows}
          principles={MARKING_PRINCIPLES}
          deductions={PART_C_DEDUCTIONS}
        />
      </div>
    </section>
  );
}
