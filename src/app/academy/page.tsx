import Link from "next/link";
import { currentStudent, sessionSecretConfigured } from "@/lib/academy/auth";
import { academyConfigured, getProgress } from "@/lib/academy/store";
import { courseHtml } from "@/lib/academy/content";
import { modules, quizModules } from "@/content/academy/modules";
import CourseRuntime from "@/components/academy/CourseRuntime";
import SignOutButton from "@/components/academy/SignOutButton";
import SignInForm from "@/components/academy/SignInForm";

/**
 * The course.
 *
 * Auth-gated, so never static and never cached. Signed out, this page is the
 * sign-in screen rather than a redirect to one — a student who follows a link
 * from their trainer should land somewhere that explains what this is, not
 * bounce to a bare form.
 */
export const dynamic = "force-dynamic";

export default async function AcademyPage() {
  const hasDb = academyConfigured();
  const hasSecret = sessionSecretConfigured();
  const ready = hasDb && hasSecret;
  const student = ready ? await currentStudent() : null;

  /* ---------------------------------------------------------- not set up -- */
  if (!ready) {
    /**
     * Name what is actually missing, rather than saying "something is".
     *
     * The first version of this page said only that configuration was
     * incomplete, which meant the first real deployment turned into guesswork
     * across three environment variables. Variable NAMES are not secrets —
     * they are already in .env.example — and this page stops rendering the
     * moment the values arrive, so the disclosure is both trivial and
     * temporary. Values are never shown, only whether each one is present.
     */
    const missing = [
      !hasDb && "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY",
      !hasSecret && "ACADEMY_SESSION_SECRET (at least 24 characters)",
    ].filter(Boolean) as string[];

    console.error("[academy] not configured — missing:", missing.join(" · "));

    return (
      <section className="py-20">
        <div className="shell max-w-[640px]">
          <span className="eyebrow">Tax Academy</span>
          <h1 className="mt-3 text-[34px] leading-[1.1]">Not set up yet</h1>
          <p className="lede mt-4">
            The Academy needs a few environment variables before anyone can
            sign in. This deployment is missing:
          </p>
          <ul className="mt-5 space-y-2">
            {missing.map((m) => (
              <li
                key={m}
                className="rounded-lg bg-[#fbeeea] px-4 py-3 font-mono text-[13.5px] text-[#a8341c]"
              >
                {m}
              </li>
            ))}
          </ul>
          <p className="mt-6 text-[15px] leading-relaxed text-ink/65">
            Add them in Vercel under Settings → Environment Variables with
            Production ticked, then <strong>redeploy</strong> — Vercel only
            reads environment variables at build time, so an existing
            deployment will not pick them up.
          </p>
          <p className="mt-3 text-[15px] text-ink/65">
            Full steps are in <code>ACADEMY-SETUP.md</code>.
          </p>
        </div>
      </section>
    );
  }

  /* ---------------------------------------------------------- signed out -- */
  if (!student) {
    return (
      <section className="py-16 sm:py-20">
        <div className="shell grid items-start gap-12 lg:grid-cols-[1fr_0.8fr] lg:gap-16">
          <div>
            <span className="eyebrow">Seasonal preparer training · TY2026</span>
            <h1 className="mt-3 text-[clamp(30px,5vw,44px)] leading-[1.06]">
              The Tax Academy
            </h1>
            <p className="lede mt-5">
              Ten weeks, nine modules. At the end of it you sit a final exam,
              and passing it is what puts you in front of a client in January.
              Everything you need is here.
            </p>

            <div className="card-quiet mt-8">
              <h2 className="text-[17px] font-bold">How this works</h2>
              <ul className="mt-3 space-y-2 pl-5 text-[15.5px] leading-relaxed text-ink/75 [list-style:disc]">
                <li>
                  Work through the modules in order. Each one takes two to four
                  hours.
                </li>
                <li>
                  <strong>Try the scenarios before you reveal the answer.</strong>{" "}
                  Getting one wrong here is free. Getting it wrong in February
                  is not.
                </li>
                <li>
                  Finish each module with its knowledge check. You need{" "}
                  <strong>70%</strong> to move on, and you may retake it as
                  often as you like.
                </li>
                <li>
                  Your scores save to your own record, so you can stop
                  mid-module and pick it up on your phone.
                </li>
              </ul>
            </div>

            <p className="mt-6 text-[14.5px] leading-relaxed text-ink/55">
              Enrolment is by invitation. If you applied and have not been
              enrolled yet, that is not a mistake on your part — call{" "}
              <a href="tel:+13137714400" className="underline">
                313-771-4400
              </a>{" "}
              and ask.
            </p>
          </div>

          <div className="lg:pt-14">
            <SignInForm />
          </div>
        </div>
      </section>
    );
  }

  /* ----------------------------------------------------------- signed in -- */
  const rows = await getProgress(student.id);
  const progress = Object.fromEntries(
    rows.map((r) => [r.module_idx, { best: r.best_score, passed: r.passed }])
  );
  const done = quizModules.filter((m) => progress[m.idx]?.passed).length;

  return (
    <section className="py-10 sm:py-14">
      <div className="shell">
        <div className="mb-8 flex flex-wrap items-baseline justify-between gap-4 border-b border-ink/10 pb-6">
          <div>
            <span className="eyebrow">Tax Academy · TY2026</span>
            <h1 className="mt-2 text-[clamp(24px,4vw,34px)] leading-[1.1]">
              {done === 0
                ? `Welcome, ${student.first_name}`
                : done === quizModules.length
                ? `All eight passed, ${student.first_name}`
                : `Welcome back, ${student.first_name}`}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            {student.role === "instructor" && (
              <Link
                href="/academy/instructor"
                className="text-[14.5px] font-semibold text-ink underline underline-offset-4 hover:text-gold-700"
              >
                Instructor view
              </Link>
            )}
            <SignOutButton />
          </div>
        </div>

        {/*
          The runtime renders the progress meter and then attaches to the
          markup below by id. The course itself never passes through a client
          component, so it ships once rather than twice — see the note at the
          top of CourseRuntime.tsx.
        */}
        <CourseRuntime initialProgress={progress} />

        <div className="cols">
          <nav className="sidenav" aria-label="Modules">
            <h3>Modules</h3>
            <ol>
              {modules.map((m) => (
                <li key={m.idx}>
                  <a href={`#m${m.idx}`}>
                    <b>{m.idx}</b> {m.short}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          {/* Not a <main>: the root layout already provides one. */}
          <div>
            <div
              id="course-body"
              dangerouslySetInnerHTML={{ __html: courseHtml() }}
            />

            <footer className="f">
              <p>
                Smart Tax IQ Tax Academy · Tax year 2026 edition · Carter Cole
                &amp; Associates LLC. All figures are tax year 2026 and are
                confirmed against IRS sources each October. This is training
                material and not tax or legal advice.
              </p>
            </footer>
          </div>
        </div>
      </div>
    </section>
  );
}
