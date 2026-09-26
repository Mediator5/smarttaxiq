"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PASS_MARK, quizModules } from "@/content/academy/modules";

/**
 * The interactive layer over the course.
 *
 * This component renders almost nothing — a progress meter and an error line.
 * Everything else on the page is server-rendered markup that it reaches into:
 * the nine modules inside `#course-body`, and the module list inside
 * `.sidenav`.
 *
 * Reaching outside its own tree is the point, not an accident. The obvious
 * alternative — passing the course in as an `html` prop, or as children —
 * puts all 73KB of it through a client component, which means it ships twice:
 * once in the streamed HTML and again in the RSC flight payload. Leaving the
 * content entirely on the server and attaching by id halves the page, and the
 * contract between the two sides is small and documented at the top of
 * src/content/academy/course.html:
 *
 *   div.quiz[data-quiz="N"]       one knowledge check
 *   div.qq[data-a="x"]            one question; data-a is the correct value
 *   label.opt > input[type=radio] the options
 *   div.fb                        the explanation, hidden until checked
 *   button.check / .score         the submit button and its result line
 *   button.reveal                 toggles the .sol beside it
 *   .sidenav a[href="#mN"]        gets .done when module N is passed
 *
 * Progress posts to /api/academy/progress, which takes the student from the
 * session cookie. A failed save says so rather than pretending.
 */

export type ProgressMap = Record<number, { best: number; passed: boolean }>;

export default function CourseRuntime({
  initialProgress,
}: {
  initialProgress: ProgressMap;
}) {
  const [progress, setProgress] = useState<ProgressMap>(initialProgress);
  const [saveError, setSaveError] = useState<string | null>(null);

  // The DOM handlers attach once, so they read progress through a ref rather
  // than closing over whatever value they saw at attach time.
  const progressRef = useRef(progress);
  progressRef.current = progress;

  const save = useCallback(async (moduleIdx: number, score: number) => {
    try {
      const res = await fetch("/api/academy/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moduleIdx, score }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };
      if (!res.ok || data.ok === false) {
        setSaveError(
          data.error ??
            "Your score didn't save. Your answers are still on screen — try the check again in a moment."
        );
        return false;
      }
      setSaveError(null);
      return true;
    } catch {
      setSaveError(
        "Your score didn't save — you may have lost your connection. Try the check again."
      );
      return false;
    }
  }, []);

  /* ---- the ticks in the module list --------------------------------- */
  useEffect(() => {
    for (const m of quizModules) {
      const link = document.querySelector<HTMLAnchorElement>(
        `.sidenav a[href="#m${m.idx}"]`
      );
      link?.classList.toggle("done", Boolean(progress[m.idx]?.passed));
    }
  }, [progress]);

  /* ---- reveals and knowledge checks ---------------------------------- */
  useEffect(() => {
    const host = document.getElementById("course-body");
    if (!host) return;

    const cleanups: Array<() => void> = [];

    host.querySelectorAll<HTMLButtonElement>("button.reveal").forEach((btn) => {
      const onClick = () => {
        const sol = btn.parentElement?.querySelector<HTMLElement>(".sol");
        if (!sol) return;
        sol.hidden = !sol.hidden;
        btn.textContent = sol.hidden ? "Show answer" : "Hide answer";
      };
      btn.addEventListener("click", onClick);
      cleanups.push(() => btn.removeEventListener("click", onClick));
    });

    host.querySelectorAll<HTMLElement>(".quiz").forEach((quiz) => {
      const idx = Number(quiz.getAttribute("data-quiz"));
      const btn = quiz.querySelector<HTMLButtonElement>("button.check");
      const out = quiz.querySelector<HTMLElement>(".score");
      if (!btn || !out || !Number.isFinite(idx)) return;

      // Show what the server already knows about this module.
      const known = progressRef.current[idx];
      if (known) {
        out.textContent = `Best so far: ${known.best}%`;
        out.className = `score ${known.passed ? "pass" : "fail"}`;
      }

      const onClick = async () => {
        const questions = Array.from(quiz.querySelectorAll<HTMLElement>(".qq"));
        let right = 0;
        let answered = 0;

        for (const qq of questions) {
          const want = qq.getAttribute("data-a");
          const picked = qq.querySelector<HTMLInputElement>("input:checked");
          const fb = qq.querySelector<HTMLElement>(".fb");

          // Stash the explanation once, so re-checking never prefixes it twice.
          if (fb && !fb.dataset.note) {
            fb.dataset.note = fb.textContent?.trim() ?? "";
          }

          if (!picked) {
            if (fb) fb.hidden = true;
            continue;
          }
          answered += 1;
          const ok = picked.value === want;
          if (ok) right += 1;
          if (fb) {
            fb.hidden = false;
            fb.className = `fb ${ok ? "right" : "wrong"}`;
            fb.textContent = `${ok ? "Correct. " : "Not quite. "}${
              fb.dataset.note
            }`;
          }
        }

        if (answered < questions.length) {
          out.textContent = `Answer all ${questions.length} questions first`;
          out.className = "score fail";
          return;
        }

        const pct = Math.round((right / questions.length) * 100);
        const passed = pct >= PASS_MARK;

        out.textContent = `${right} of ${questions.length} — ${pct}%${
          passed ? " · passed" : " · try again"
        }`;
        out.className = `score ${passed ? "pass" : "fail"}`;

        btn.disabled = true;
        const saved = await save(idx, pct);
        btn.disabled = false;

        if (saved) {
          setProgress((prev) => {
            const before = prev[idx];
            return {
              ...prev,
              [idx]: {
                best: Math.max(pct, before?.best ?? 0),
                passed: Boolean(before?.passed) || passed,
              },
            };
          });
        }
      };

      btn.addEventListener("click", onClick);
      cleanups.push(() => btn.removeEventListener("click", onClick));
    });

    return () => cleanups.forEach((fn) => fn());
    // The course markup is static for the life of the page, so this runs once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [save]);

  const total = quizModules.length;
  const done = quizModules.filter((m) => progress[m.idx]?.passed).length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  return (
    <>
      <div className="sticky top-0 z-30 -mx-5 mb-8 border-b border-ink/10 bg-white/95 px-5 py-3 backdrop-blur sm:-mx-8 sm:px-8">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span
            className="font-mono text-[11.5px] uppercase tracking-[0.1em] text-ink/55"
            aria-live="polite"
          >
            {done} of {total} complete
          </span>
          <span className="h-[5px] w-[130px] overflow-hidden rounded-full bg-ink/10">
            <span
              className="block h-full rounded-full bg-gold-500 transition-[width] duration-500 motion-reduce:transition-none"
              style={{ width: `${pct}%` }}
            />
          </span>
        </div>
      </div>

      {saveError && (
        <p
          role="alert"
          className="mb-8 rounded-xl bg-[#fbeeea] px-5 py-4 text-[15px] leading-relaxed text-[#a8341c]"
        >
          {saveError}
        </p>
      )}
    </>
  );
}
