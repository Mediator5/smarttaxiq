import Link from "next/link";
import { notFound } from "next/navigation";
import { currentStudent, sessionSecretConfigured } from "@/lib/academy/auth";
import { academyConfigured, getCohort } from "@/lib/academy/store";
import { PASS_MARK, quizModules } from "@/content/academy/modules";

/**
 * The cohort dashboard.
 *
 * One row per student, one column per knowledge check, plus when they were
 * last here. Nothing clever — the point of it is to answer one question in
 * four seconds: who is in trouble, and since when?
 *
 * Gated on the `instructor` role in academy_students. Anyone else, signed in
 * or not, gets a 404 rather than a "forbidden" page: there is no reason to
 * confirm to a student that this URL exists.
 */
export const dynamic = "force-dynamic";

function when(iso: string | null) {
  if (!iso) return "never";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "never";
  const mins = Math.round((Date.now() - then) / 60_000);
  if (mins < 2) return "just now";
  if (mins < 60) return `${mins} min ago`;
  if (mins < 60 * 36) return `${Math.round(mins / 60)} h ago`;
  return `${Math.round(mins / 1440)} days ago`;
}

/** Nine days without opening the course is the signal worth acting on. */
function stale(iso: string | null) {
  if (!iso) return true;
  return Date.now() - new Date(iso).getTime() > 9 * 24 * 60 * 60 * 1000;
}

export default async function InstructorPage() {
  if (!academyConfigured() || !sessionSecretConfigured()) notFound();

  const viewer = await currentStudent();
  if (!viewer || viewer.role !== "instructor") notFound();

  const cohort = await getCohort(viewer.cohort);

  return (
    <section className="py-10 sm:py-14">
      <div className="shell">
        <div className="mb-8 flex flex-wrap items-baseline justify-between gap-4 border-b border-ink/10 pb-6">
          <div>
            <span className="eyebrow">Instructor view · {viewer.cohort}</span>
            <h1 className="mt-2 text-[clamp(24px,4vw,34px)] leading-[1.1]">
              Cohort progress
            </h1>
            <p className="lede mt-3 max-w-[62ch]">
              A module counts as passed at {PASS_MARK}% or better on its
              knowledge check. Retakes are unlimited, so a score that
              stays red for a week is the signal — not a red score on the day.
            </p>
          </div>
          <Link
            href="/academy"
            className="text-[14.5px] font-semibold text-ink underline underline-offset-4 hover:text-gold-700"
          >
            Back to the course
          </Link>
        </div>

        {cohort.length === 0 ? (
          <div className="card-quiet">
            <h2 className="text-[17px] font-bold">Nobody enrolled yet</h2>
            <p className="mt-2 text-[15.5px] leading-relaxed text-ink/75">
              Students appear here as soon as they are added to{" "}
              <code>academy_students</code> with cohort{" "}
              <strong>{viewer.cohort}</strong>. The insert is at the bottom of{" "}
              <code>supabase/academy.sql</code>.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto rounded-2xl border border-ink/10">
              <table className="cohort w-full">
                <thead>
                  <tr>
                    <th className="stu" scope="col">
                      Student
                    </th>
                    {quizModules.map((m) => (
                      <th key={m.idx} scope="col" title={m.title}>
                        M{m.idx}
                      </th>
                    ))}
                    <th scope="col">Passed</th>
                    <th scope="col">Last seen</th>
                  </tr>
                </thead>
                <tbody>
                  {cohort
                    .slice()
                    .sort((a, b) => {
                      const pa = a.progress.filter((p) => p.passed).length;
                      const pb = b.progress.filter((p) => p.passed).length;
                      return pb - pa || a.first_name.localeCompare(b.first_name);
                    })
                    .map((s) => {
                      const byModule = new Map(
                        s.progress.map((p) => [p.module_idx, p])
                      );
                      const passed = s.progress.filter((p) => p.passed).length;
                      return (
                        <tr key={s.id}>
                          <td className="stu">
                            {s.first_name} {s.last_name ?? ""}
                            <span className="block font-normal text-[11.5px] text-ink/45">
                              {s.email}
                            </span>
                          </td>
                          {quizModules.map((m) => {
                            const row = byModule.get(m.idx);
                            const cls = !row
                              ? "n"
                              : row.passed
                              ? "p"
                              : "f";
                            return (
                              <td key={m.idx} className={`q ${cls}`}>
                                {row ? `${row.best_score}%` : "–"}
                                {row && row.attempts > 1 && (
                                  <span className="block text-[10px] text-ink/40">
                                    {row.attempts} tries
                                  </span>
                                )}
                              </td>
                            );
                          })}
                          <td className="tot">
                            {passed}/{quizModules.length}
                          </td>
                          <td
                            className="seen"
                            style={
                              stale(s.last_seen_at)
                                ? { color: "#a8341c", fontWeight: 600 }
                                : undefined
                            }
                          >
                            {when(s.last_seen_at)}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <p className="rounded-xl bg-ice px-4 py-3 text-[14px] leading-relaxed text-ink/75">
                <strong className="text-ink">A dash</strong> means the check has
                not been attempted. Chase it.
              </p>
              <p className="rounded-xl bg-ice px-4 py-3 text-[14px] leading-relaxed text-ink/75">
                <strong className="text-ink">Red</strong> means attempted and
                under 70%. Look at the try count before you worry.
              </p>
              <p className="rounded-xl bg-ice px-4 py-3 text-[14px] leading-relaxed text-ink/75">
                <strong className="text-ink">Last seen in red</strong> is nine
                days or more. That is usually someone who has already stopped.
              </p>
            </div>
          </>
        )}

        <p className="mt-10 max-w-[62ch] text-[14.5px] leading-relaxed text-ink/55">
          Knowledge-check scores track engagement, not competence. The marks
          that decide whether somebody works the season are the six
          assignments, the four practice returns and the December exam — all
          marked on paper, by you. The Instructor Pack has the rubric.
        </p>
      </div>
    </section>
  );
}
