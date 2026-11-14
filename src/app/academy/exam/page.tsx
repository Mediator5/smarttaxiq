import Link from "next/link";
import { currentStudent, sessionSecretConfigured } from "@/lib/academy/auth";
import { academyConfigured } from "@/lib/academy/store";
import {
  attemptsFor,
  certificationFor,
  finalizeAttempt,
  listExamFiles,
  liveAttempt,
  openRelease,
} from "@/lib/academy/exam-store";
import { expired, listParts, standing } from "@/lib/academy/exam";
import {
  EXAM_MINUTES,
  EXAM_WINDOW,
  PART_SPECS,
  RETAKE_WAIT_DAYS,
  paperForStudent,
  type ExamPart,
} from "@/content/academy/exam";
import AcademyNav from "@/components/academy/AcademyNav";
import ExamRoom, { type Sitting } from "@/components/academy/ExamRoom";

/**
 * The student's exam page.
 *
 * One page for every state a candidate can be in: not released yet, released
 * and about to start, mid-sitting, handed in and waiting, and finished. The
 * states are worked out here on the server from the roster and the attempt
 * rows, because the only thing a browser is trusted with on this page is
 * displaying them.
 *
 * It is also where the exam is explained. Until now the only description of
 * the December paper lived in Module 8, which a student reaches in Week 10 —
 * so a student who had not got there believed there was no exam at all. The
 * summary at the top of this page is the fix for that.
 */
export const dynamic = "force-dynamic";

const ORDER: ExamPart[] = ["A", "B", "C", "D"];

export default async function ExamPage() {
  const ready = academyConfigured() && sessionSecretConfigured();
  const student = ready ? await currentStudent() : null;

  if (!ready || !student) {
    return (
      <section className="py-20">
        <div className="shell max-w-[640px]">
          <span className="eyebrow">Tax Academy</span>
          <h1 className="mt-3 text-[34px] leading-[1.1]">The final exam</h1>
          <p className="lede mt-4">
            {ready
              ? "Sign in on the course page and the exam will be here."
              : "The Academy is not set up on this deployment yet."}
          </p>
          {ready && (
            <Link href="/academy" className="btn-gold mt-7">
              Go to the course
            </Link>
          )}
        </div>
      </section>
    );
  }

  /* ------------------------------------------------------- where they are */

  let live = await liveAttempt(student.id);
  if (live && expired(live.expires_at)) {
    await finalizeAttempt(live.id, "time");
    live = null;
  }

  const [release, attempts, certification] = await Promise.all([
    openRelease(student.id),
    attemptsFor(student.id),
    certificationFor(student.id),
  ]);

  const where = standing(attempts);
  const submitted = attempts.filter((a) => a.submitted_at);
  const lastSubmitted = submitted[0] ?? null;

  let resume: Sitting | null = null;
  if (live) {
    const files = await listExamFiles(live.id);
    resume = {
      attemptId: live.id,
      paper: paperForStudent(live.paper, live.parts) as unknown as Sitting["paper"],
      answers: live.answers ?? {},
      remainingMs: Math.max(0, new Date(live.expires_at).getTime() - Date.now()),
      files: files.map((f) => ({
        id: f.id,
        fileName: f.file_name,
        questionId: f.question_id,
      })),
    };
  }

  const certified = Boolean(certification && !certification.revoked_at);

  return (
    <section className="py-12 sm:py-16">
      <div className="shell max-w-[860px]">
        <AcademyNav role={student.role} />

        <header className="mt-10">
          <span className="eyebrow">Sat {EXAM_WINDOW}</span>
          <h1 className="mt-3 text-[clamp(28px,4.5vw,40px)] leading-[1.08]">
            The final exam
          </h1>
          <p className="lede mt-4 max-w-[62ch]">
            Two hours, open book. You may sit it on paper at the office or here
            on screen, and it is the same paper either way. Passing it is what
            puts you in front of a client in January.
          </p>
        </header>

        {/* ------------------------------------------------ what it is -- */}
        <div className="card-quiet mt-9">
          <h2 className="text-[18px] font-bold">How it is marked</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-[15px]">
              <thead>
                <tr className="border-b border-ink/15 text-[11.5px] uppercase tracking-[0.12em] text-ink/55">
                  <th className="py-2 pr-4 font-bold">Part</th>
                  <th className="py-2 pr-4 font-bold">Covers</th>
                  <th className="py-2 pr-4 font-bold">Marks</th>
                  <th className="py-2 font-bold">To pass</th>
                </tr>
              </thead>
              <tbody>
                {ORDER.map((part) => {
                  const spec = PART_SPECS[part];
                  const mine = where.parts.find((p) => p.part === part);
                  return (
                    <tr key={part} className="border-b border-ink/8">
                      <td className="py-2.5 pr-4 font-mono font-bold">{part}</td>
                      <td className="py-2.5 pr-4">{spec.title}</td>
                      <td className="py-2.5 pr-4 tabular-nums">{spec.marks}</td>
                      <td className="py-2.5 tabular-nums">
                        {spec.passPct}%
                        {mine?.best && (
                          <span
                            className={`ml-3 text-[13px] font-semibold ${
                              mine.passed ? "text-[#1f6f4a]" : "text-[#a8341c]"
                            }`}
                          >
                            you scored {mine.best.awarded}/{mine.best.available}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-4 max-w-[64ch] text-[14.5px] leading-relaxed text-ink/65">
            You must pass every part. A high total does not rescue a failed
            part — Parts A and B need {PART_SPECS.A.passPct}% because that is
            where the penalties are and where the firm&rsquo;s license is on the
            line. There is one retake, at least {RETAKE_WAIT_DAYS} days later,
            with different scenarios, and you re-sit only the parts you failed.
            Most people who need a retake pass it.
          </p>
        </div>

        {/* ------------------------------------------------ the verdict -- */}
        {certified && certification && (
          <div className="mt-9 rounded-2xl border border-[#1f6f4a]/30 bg-[#f1f8f4] p-7">
            <h2 className="text-[20px] font-bold text-[#17543a]">
              You passed. All four parts.
            </h2>
            <p className="mt-3 max-w-[60ch] text-[15.5px] leading-relaxed text-ink/75">
              Your certificate is ready. It carries your name as it appears on
              the roster, the date you passed and certificate number{" "}
              <span className="font-mono">{certification.certificate_no}</span>.
            </p>
            <a href="/api/academy/certificate" className="btn-gold mt-6">
              Download your certificate
            </a>
          </div>
        )}

        {!certified && where.awaitingMarking && !live && (
          <div className="card mt-9">
            <h2 className="text-[20px] font-bold">Handed in, being marked</h2>
            <p className="mt-3 max-w-[60ch] text-[15.5px] leading-relaxed text-ink/70">
              Parts A and B are marked already. Parts C and D are marked by
              hand — a complete return and five written answers are not
              something a computer should be grading. Lashanda will have your
              marking sheet back to you within three days, with notes against
              the question numbers.
            </p>
          </div>
        )}

        {!certified &&
          !where.awaitingMarking &&
          !live &&
          !release &&
          submitted.length > 0 && (
            <div className="card mt-9">
              <h2 className="text-[20px] font-bold">
                {listParts(where.failedParts)} to re-sit
              </h2>
              <p className="mt-3 max-w-[60ch] text-[15.5px] leading-relaxed text-ink/70">
                You passed everything else, and that stands — a retake covers
                only what you did not pass. Lashanda will release Paper B to
                you, at least {RETAKE_WAIT_DAYS} days after your last sitting.
                Most people who need a retake pass it.
              </p>
            </div>
          )}

        {/* ---------------------------------------------- the paper itself */}
        {(live || release) && (
          <div className="mt-9">
            <ExamRoom
              resume={resume}
              release={
                release
                  ? { paper: release.paper, parts: release.parts }
                  : null
              }
              minutes={EXAM_MINUTES}
            />
          </div>
        )}

        {!live && !release && !certified && submitted.length === 0 && (
          <div className="card mt-9">
            <h2 className="text-[20px] font-bold">Not open to you yet</h2>
            <p className="mt-3 max-w-[60ch] text-[15.5px] leading-relaxed text-ink/70">
              The exam is released by your instructor when the cohort reaches
              it, in the week of {EXAM_WINDOW}. If you are sitting it at the
              office there is nothing to do here. If you are sitting it on
              screen, this page is where it will appear — and you will have{" "}
              {EXAM_MINUTES} minutes from the moment you start.
            </p>
            <p className="mt-3 text-[15px] text-ink/65">
              Everything it covers is in the nine modules. Module 8 sets out
              the paper in detail.
            </p>
          </div>
        )}

        {/* ------------------------------------------------- the history -- */}
        {submitted.length > 0 && (
          <div className="mt-12">
            <h2 className="text-[16px] font-bold">Your sittings</h2>
            <ul className="mt-4 space-y-2">
              {submitted.map((attempt) => (
                <li
                  key={attempt.id}
                  className="flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-xl border border-ink/10 bg-white px-5 py-3.5 text-[14.5px]"
                >
                  <span className="font-semibold text-ink">
                    Paper {attempt.paper}
                  </span>
                  <span className="text-ink/55">
                    {listParts(attempt.parts)}
                  </span>
                  <span className="text-ink/45">
                    {new Date(attempt.submitted_at!).toLocaleDateString("en-US", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                  {attempt.submitted_reason === "time" && (
                    <span className="text-ink/45">time ran out</span>
                  )}
                  <span
                    className={`ml-auto font-semibold ${
                      attempt.result === "pass"
                        ? "text-[#1f6f4a]"
                        : attempt.result === "retake"
                          ? "text-[#a8341c]"
                          : "text-ink/50"
                    }`}
                  >
                    {attempt.result === "pass"
                      ? "Passed"
                      : attempt.result === "retake"
                        ? `Retake ${listParts(attempt.failed_parts ?? [])}`
                        : "Being marked"}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {lastSubmitted && (
          <p className="mt-6 text-[13.5px] text-ink/45">
            Your marking sheet comes back from Lashanda within three days,
            whatever the result — a pass still tells you which two answers were
            weak.
          </p>
        )}
      </div>
    </section>
  );
}
