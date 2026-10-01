"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AcademyModule } from "@/content/academy/modules";
import type { Announcement, ModuleExtra } from "@/lib/academy/store";

/**
 * What the instructor can change about the teaching itself: a video and a note
 * per module, and announcements to the cohort.
 *
 * Module text is not here. It lives in the repository because the knowledge
 * checks depend on exact markup, and a rich-text box over the top of that is a
 * dependable way to break a quiz the week before an exam. The page says so
 * rather than leaving her to wonder where the edit button is.
 */

export default function TeachingManager({
  modules,
  extras,
  announcements,
}: {
  modules: AcademyModule[];
  extras: ModuleExtra[];
  announcements: Announcement[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"videos" | "notices">("videos");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const byIdx = new Map(extras.map((e) => [e.module_idx, e]));
  const [draft, setDraft] = useState<
    Record<number, { url: string; title: string; note: string }>
  >(() =>
    Object.fromEntries(
      modules.map((m) => {
        const e = byIdx.get(m.idx);
        return [
          m.idx,
          {
            url: e?.video_url ?? "",
            title: e?.video_title ?? "",
            note: e?.note ?? "",
          },
        ];
      })
    )
  );

  const [notice, setNotice] = useState("");
  const [alsoEmail, setAlsoEmail] = useState(true);

  async function send(payload: Record<string, unknown>, key: string) {
    setBusy(key);
    setError(null);
    setDone(null);
    try {
      const res = await fetch("/api/academy/teaching", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        emailedCount?: number;
        emailError?: string | null;
      };
      if (!res.ok || data.ok === false) {
        setError(data.error ?? "That didn't save.");
        return null;
      }
      router.refresh();
      return data;
    } catch {
      setError("Couldn't reach the server. Check your connection.");
      return null;
    } finally {
      setBusy(null);
    }
  }

  const labelClass =
    "block text-[11.5px] font-bold uppercase tracking-[0.16em] text-ink/55";
  const inputClass =
    "mt-2 w-full rounded-lg border border-ink/15 bg-white px-4 py-3 text-[15.5px] text-ink outline-none transition focus:border-gold-500";

  return (
    <div>
      {/* ---------------------------------------------------------- tabs -- */}
      <div className="mb-10 flex gap-2 border-b border-ink/10">
        {(
          [
            ["videos", "Videos & module notes"],
            ["notices", "Announcements"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`-mb-px border-b-2 px-4 py-3 text-[15px] font-semibold transition ${
              tab === key
                ? "border-gold-500 text-ink"
                : "border-transparent text-ink/50 hover:text-ink"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* -------------------------------------------------------- videos -- */}
      {tab === "videos" && (
        <div>
          <p className="lede max-w-[62ch]">
            Paste a YouTube or Vimeo link and students see the player at the top
            of that module. Leave it empty and the module looks exactly as it
            does now.
          </p>

          <div className="card-quiet mt-6 max-w-[62ch]">
            <h2 className="text-[16px] font-bold">What you cannot change here</h2>
            <p className="mt-2 text-[15px] leading-relaxed text-ink/75">
              The teaching text of each module, and the knowledge-check
              questions. Those live in the site&rsquo;s code because the quizzes
              depend on their exact structure, and an editing box over the top
              of them is the most reliable way to break a check the week before
              an exam. Send those changes to Mikel &mdash; a wording fix is
              usually same-day.
            </p>
          </div>

          <div className="mt-10 space-y-5">
            {modules.map((m) => {
              const d = draft[m.idx];
              const saved = byIdx.get(m.idx);
              const dirty =
                d.url !== (saved?.video_url ?? "") ||
                d.title !== (saved?.video_title ?? "") ||
                d.note !== (saved?.note ?? "");

              return (
                <div
                  key={m.idx}
                  className="rounded-2xl border border-ink/10 bg-white p-6"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-3">
                    <h3 className="text-[17px] font-bold text-ink">
                      <span className="mr-2 font-mono text-[13px] text-gold-700">
                        M{m.idx}
                      </span>
                      {m.title}
                    </h3>
                    <span className="font-mono text-[12px] text-ink/45">
                      {m.week}
                    </span>
                  </div>

                  <div className="mt-5 grid gap-4 sm:grid-cols-[1.4fr_1fr]">
                    <div>
                      <label
                        htmlFor={`v-${m.idx}`}
                        className={labelClass}
                      >
                        Video link
                      </label>
                      <input
                        id={`v-${m.idx}`}
                        type="url"
                        inputMode="url"
                        placeholder="Paste a YouTube or Vimeo link"
                        value={d.url}
                        onChange={(e) =>
                          setDraft((p) => ({
                            ...p,
                            [m.idx]: { ...p[m.idx], url: e.target.value },
                          }))
                        }
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label
                        htmlFor={`t-${m.idx}`}
                        className={labelClass}
                      >
                        Label{" "}
                        <span className="font-normal normal-case tracking-normal text-ink/45">
                          (optional)
                        </span>
                      </label>
                      <input
                        id={`t-${m.idx}`}
                        type="text"
                        placeholder="e.g. Watch before Tuesday"
                        value={d.title}
                        onChange={(e) =>
                          setDraft((p) => ({
                            ...p,
                            [m.idx]: { ...p[m.idx], title: e.target.value },
                          }))
                        }
                        className={inputClass}
                      />
                    </div>
                  </div>

                  <div className="mt-4">
                    <label htmlFor={`n-${m.idx}`} className={labelClass}>
                      Note to the class{" "}
                      <span className="font-normal normal-case tracking-normal text-ink/45">
                        (optional, shows above the module)
                      </span>
                    </label>
                    <textarea
                      id={`n-${m.idx}`}
                      rows={2}
                      maxLength={2000}
                      placeholder="e.g. We'll do the scenarios together on the Zoom — try them first."
                      value={d.note}
                      onChange={(e) =>
                        setDraft((p) => ({
                          ...p,
                          [m.idx]: { ...p[m.idx], note: e.target.value },
                        }))
                      }
                      className={`${inputClass} resize-y leading-relaxed`}
                    />
                  </div>

                  <div className="mt-4 flex items-center gap-4">
                    <button
                      type="button"
                      disabled={busy !== null || !dirty}
                      onClick={async () => {
                        const r = await send(
                          {
                            action: "save-module",
                            moduleIdx: m.idx,
                            videoUrl: d.url,
                            videoTitle: d.title,
                            note: d.note,
                          },
                          `m${m.idx}`
                        );
                        if (r) setDone(`Module ${m.idx} saved.`);
                      }}
                      className="btn-gold px-5 py-2.5 text-[14px]"
                    >
                      {busy === `m${m.idx}` ? "Saving…" : "Save"}
                    </button>
                    {dirty && (
                      <span className="text-[13.5px] text-ink/45">
                        Unsaved changes
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------- notices -- */}
      {tab === "notices" && (
        <div>
          <p className="lede max-w-[62ch]">
            A notice appears at the top of the course page for everyone. Tick the
            box and it also goes to each trainee by email, one message each, so
            nobody sees anyone else&rsquo;s address.
          </p>

          <div className="card mt-6">
            <label htmlFor="notice" className={labelClass}>
              What do you want to tell them?
            </label>
            <textarea
              id="notice"
              rows={5}
              maxLength={4000}
              value={notice}
              onChange={(e) => setNotice(e.target.value)}
              placeholder={
                "e.g. Thursday's session moves to 7pm. Same Zoom link. Bring your workbook — we're doing the Angela scenario properly this time."
              }
              className={`${inputClass} resize-y leading-relaxed`}
            />

            <label className="mt-4 flex cursor-pointer items-start gap-3 text-[15px] text-ink/75">
              <input
                type="checkbox"
                checked={alsoEmail}
                onChange={(e) => setAlsoEmail(e.target.checked)}
                className="mt-1 h-4 w-4 accent-[#d8b038]"
              />
              <span>
                Email it to the trainees as well
                <span className="block text-[13.5px] text-ink/50">
                  Leave this off for something that can wait until they next
                  open the course.
                </span>
              </span>
            </label>

            <button
              type="button"
              disabled={busy !== null || notice.trim().length < 3}
              onClick={async () => {
                const r = await send(
                  { action: "announce", body: notice, email: alsoEmail },
                  "announce"
                );
                if (r) {
                  setNotice("");
                  setDone(
                    r.emailError
                      ? r.emailError
                      : alsoEmail
                      ? `Posted, and emailed to ${r.emailedCount} ${
                          r.emailedCount === 1 ? "trainee" : "trainees"
                        }.`
                      : "Posted to the course page."
                  );
                }
              }}
              className="btn-gold mt-5"
            >
              {busy === "announce" ? "Posting…" : "Post it"}
            </button>
          </div>

          <h2 className="mt-12 text-[20px] font-bold">Already posted</h2>
          {announcements.length === 0 ? (
            <p className="mt-3 text-[15.5px] text-ink/65">
              Nothing yet. The first one is usually &ldquo;welcome, here is how
              Thursday works&rdquo;.
            </p>
          ) : (
            <ul className="mt-5 space-y-3">
              {announcements.map((a) => (
                <li
                  key={a.id}
                  className={`rounded-2xl border border-ink/10 bg-white p-5 ${
                    a.hidden ? "opacity-55" : ""
                  }`}
                >
                  <p className="whitespace-pre-wrap text-[15.5px] leading-relaxed text-ink/80">
                    {a.body}
                  </p>
                  <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-ink/50">
                    <span className="font-mono">
                      {new Date(a.created_at).toLocaleDateString(undefined, {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    <span>{a.emailed_at ? "Emailed" : "Page only"}</span>
                    {a.hidden && (
                      <span className="font-semibold text-[#a8341c]">
                        Hidden
                      </span>
                    )}
                    <button
                      type="button"
                      disabled={busy !== null}
                      onClick={() =>
                        send(
                          { action: a.hidden ? "unhide" : "hide", id: a.id },
                          a.id
                        )
                      }
                      className="ml-auto underline underline-offset-2 hover:text-ink"
                    >
                      {busy === a.id
                        ? "…"
                        : a.hidden
                        ? "Show again"
                        : "Take it down"}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {done && !error && (
        <p className="mt-8 rounded-xl bg-mint-50 px-5 py-4 text-[15px] text-mint-800">
          {done}
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="mt-8 rounded-xl bg-[#fbeeea] px-5 py-4 text-[15px] text-[#a8341c]"
        >
          {error}
        </p>
      )}
    </div>
  );
}
