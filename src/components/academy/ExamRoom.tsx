"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/**
 * The timed sitting.
 *
 * Three things this component is careful about, because each of them is a way
 * a student can lose work they actually did:
 *
 *   1. The countdown is never a tick count. It is recomputed from a deadline,
 *      and the deadline is re-read from the server every minute. A laptop that
 *      sleeps for twenty minutes wakes up showing the right time left, and a
 *      system clock wound back shows the right time left too — the server is
 *      the only clock that counts, and the display is corrected to match it.
 *
 *   2. Every answer is saved as it is given: selections the moment they are
 *      made, typing a second and a half after it stops and again on blur. A
 *      browser that closes mid-sentence costs that sentence and nothing else.
 *
 *   3. Running out of time hands the paper in rather than discarding it. What
 *      was answered is marked; what was not is not.
 *
 * It holds no answer key, and there is none in anything it is given. Marks are
 * worked out on the server after the paper is handed in.
 */

type Choice = { id: string; label: string };

type PartSpec = {
  part: "A" | "B" | "C" | "D";
  title: string;
  marks: number;
  needed: number;
  passPct: number;
  allowMinutes: number;
  howMarked: "auto" | "instructor";
  instruction: string;
};

type QuestionA = { id: string; marks: number; facts: string };
type QuestionB = {
  id: string;
  marks: number;
  facts: string;
  outcomes: Choice[];
};
type QuestionWritten = {
  id: string;
  marks: number;
  prompt: string;
  hint?: string;
  rows: number;
};

type PartCBrief = {
  heading: string;
  client: string;
  documents: { doc: string; details: string }[];
  said: string;
  questions: QuestionWritten[];
};

export type StudentPaperData = {
  id: "A" | "B";
  label: string;
  parts: PartSpec[];
  a: QuestionA[];
  b: QuestionB[];
  c: PartCBrief | null;
  d: QuestionWritten[];
  statuses: Choice[];
  tests: Choice[];
  rules: Choice[];
};

type Answer = {
  status?: string;
  test?: string;
  outcome?: string;
  rule?: string;
  text?: string;
};

type AttachedFile = {
  id: string;
  fileName: string;
  questionId: string | null;
};

export type Sitting = {
  attemptId: string;
  paper: StudentPaperData;
  answers: Record<string, Answer>;
  remainingMs: number;
  files: AttachedFile[];
};

type Props = {
  /** A sitting already in progress, picked up where it was left. */
  resume: Sitting | null;
  /** What this student has been released to sit, for the start screen. */
  release: { paper: "A" | "B"; parts: ("A" | "B" | "C" | "D")[] } | null;
  minutes: number;
};

type Phase = "ready" | "sitting" | "handing-in" | "submitted";

/* -------------------------------------------------------------- helpers -- */

function clock(ms: number) {
  const total = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

async function post(body: unknown) {
  const res = await fetch("/api/academy/exam", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return { status: res.status, data: await res.json().catch(() => ({})) };
}

/* ------------------------------------------------------------ component -- */

export default function ExamRoom({ resume, release, minutes }: Props) {
  const [phase, setPhase] = useState<Phase>(resume ? "sitting" : "ready");
  const [sitting, setSitting] = useState<Sitting | null>(resume);
  const [answers, setAnswers] = useState<Record<string, Answer>>(
    resume?.answers ?? {}
  );
  const [files, setFiles] = useState<AttachedFile[]>(resume?.files ?? []);

  /** Absolute moment the paper closes, in this browser's own frame. */
  const [deadline, setDeadline] = useState<number | null>(
    resume ? Date.now() + resume.remainingMs : null
  );
  const [now, setNow] = useState(() => Date.now());

  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [activePart, setActivePart] = useState<"A" | "B" | "C" | "D">(
    (resume?.paper.parts[0]?.part as "A") ?? "A"
  );

  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const submitted = useRef(false);

  const remaining = deadline === null ? 0 : Math.max(0, deadline - now);

  /* --------------------------------------------------------- the clock -- */

  useEffect(() => {
    if (phase !== "sitting") return;
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, [phase]);

  // Re-read the deadline from the server every minute. This is what makes a
  // slept laptop, a changed system clock and a throttled background tab all
  // show the truth rather than their own arithmetic.
  useEffect(() => {
    if (phase !== "sitting") return;
    const sync = setInterval(async () => {
      const { data } = await post({ action: "time" });
      if (typeof data?.remainingMs === "number") {
        setDeadline(Date.now() + data.remainingMs);
      }
    }, 60_000);
    return () => clearInterval(sync);
  }, [phase]);

  /* ------------------------------------------------------------ saving -- */

  const save = useCallback(
    async (questionId: string, value: Answer) => {
      setSaving((n) => n + 1);
      try {
        const { status, data } = await post({
          action: "save",
          questionId,
          value,
        });

        if (status === 410 || data?.reason === "expired") {
          submitted.current = true;
          setPhase("submitted");
          return;
        }
        if (!data?.ok) {
          setError("That answer did not save. Check your connection.");
          return;
        }
        setError(null);
        if (typeof data.remainingMs === "number") {
          setDeadline(Date.now() + data.remainingMs);
        }
      } catch {
        setError("That answer did not save. Check your connection.");
      } finally {
        setSaving((n) => Math.max(0, n - 1));
      }
    },
    []
  );

  /** A selection: recorded at once, because it is one click and it is done. */
  const choose = useCallback(
    (questionId: string, patch: Answer) => {
      setAnswers((prev) => ({ ...prev, [questionId]: { ...prev[questionId], ...patch } }));
      void save(questionId, patch);
    },
    [save]
  );

  /** Typing: held for a second and a half, so one save is not one keystroke. */
  const type = useCallback(
    (questionId: string, text: string) => {
      setAnswers((prev) => ({ ...prev, [questionId]: { ...prev[questionId], text } }));
      clearTimeout(timers.current[questionId]);
      timers.current[questionId] = setTimeout(() => {
        void save(questionId, { text });
      }, 1500);
    },
    [save]
  );

  /** Leaving a box flushes it immediately rather than waiting out the timer. */
  const flush = useCallback(
    (questionId: string) => {
      const pending = timers.current[questionId];
      if (!pending) return;
      clearTimeout(pending);
      delete timers.current[questionId];
      void save(questionId, { text: answers[questionId]?.text ?? "" });
    },
    [answers, save]
  );

  useEffect(() => {
    const pending = timers.current;
    return () => {
      for (const t of Object.values(pending)) clearTimeout(t);
    };
  }, []);

  /* ------------------------------------------------- starting, handing in */

  const begin = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const { data } = await post({ action: "start" });
      if (!data?.ok) {
        setError(
          data?.reason === "no-release"
            ? "You have not been released to sit the exam yet."
            : data?.reason === "too-soon"
              ? "A retake is seven days after the last sitting."
              : "The paper could not be opened. Try again in a moment."
        );
        return;
      }
      if (data.state === "submitted") {
        setPhase("submitted");
        return;
      }
      setSitting({
        attemptId: data.attemptId,
        paper: data.paper,
        answers: data.answers ?? {},
        remainingMs: data.remainingMs,
        files: [],
      });
      setAnswers(data.answers ?? {});
      setDeadline(Date.now() + data.remainingMs);
      setActivePart(data.paper.parts[0]?.part ?? "A");
      setPhase("sitting");
    } finally {
      setBusy(false);
    }
  }, []);

  const handIn = useCallback(
    async (reason: "student" | "time") => {
      if (submitted.current) return;
      submitted.current = true;
      setPhase("handing-in");

      // Flush anything still sitting in a debounce before the paper closes.
      for (const [qid, timer] of Object.entries(timers.current)) {
        clearTimeout(timer);
        delete timers.current[qid];
        if (reason === "student") {
          await save(qid, { text: answers[qid]?.text ?? "" });
        }
      }

      await post({ action: "submit" });
      setPhase("submitted");
    },
    [answers, save]
  );

  // Time up. The paper goes in with whatever is on it.
  useEffect(() => {
    if (phase !== "sitting" || deadline === null) return;
    if (remaining > 0) return;
    void handIn("time");
  }, [phase, remaining, deadline, handIn]);

  // The browser's own are-you-sure, for a tab closed by accident mid-sitting.
  useEffect(() => {
    if (phase !== "sitting") return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [phase]);

  /* ----------------------------------------------------------- progress -- */

  const questionIds = useMemo(() => {
    if (!sitting) return [] as string[];
    const p = sitting.paper;
    return [
      ...p.a.map((q) => q.id),
      ...p.b.map((q) => q.id),
      ...(p.c?.questions.map((q) => q.id) ?? []),
      ...p.d.map((q) => q.id),
    ];
  }, [sitting]);

  const answeredCount = questionIds.filter((qid) => {
    const given = answers[qid];
    if (!given) return false;
    if (qid.startsWith("A")) return Boolean(given.status && given.test);
    if (qid.startsWith("B")) return Boolean(given.outcome && given.rule);
    return Boolean(given.text && given.text.trim().length > 0);
  }).length;

  /* ------------------------------------------------------------ screens -- */

  if (phase === "submitted") {
    return (
      <div className="card-quiet">
        <h2 className="text-[20px] font-bold">Your paper is in.</h2>
        <p className="mt-3 max-w-[60ch] text-[15.5px] leading-relaxed text-ink/70">
          Parts A and B are marked already. Parts C and D are marked by hand,
          and Lashanda will have your marking sheet back to you within three
          days with notes against the question numbers. Refresh this page later
          and your result will be here.
        </p>
        <a href="/academy/exam" className="btn-gold mt-6">
          Refresh
        </a>
      </div>
    );
  }

  if (phase === "ready" || !sitting) {
    const parts = release?.parts ?? ["A", "B", "C", "D"];
    return (
      <div className="card">
        <span className="eyebrow">
          {release?.paper === "B" ? "Paper B — retake" : "Paper A"}
        </span>
        <h2 className="mt-3 text-[22px] font-bold">
          Before you press start, read this
        </h2>

        <ul className="mt-5 space-y-3 pl-5 text-[15.5px] leading-relaxed text-ink/75 [list-style:disc]">
          <li>
            You have <strong>{minutes} minutes</strong> from the moment you
            press start. The clock runs on our server, so closing the tab,
            refreshing or moving to another device does not stop it and does
            not give you more time.
          </li>
          <li>
            It is <strong>open book</strong>. Use your figures sheet and the
            forms — that is what you will have on your desk in January. You may
            look up any figure. You may not look up an answer, and you may not
            use the course page.
          </li>
          <li>
            Every answer saves as you give it. If your laptop dies, sign back
            in and carry on — the clock will be where it genuinely is.
          </li>
          <li>
            You are sitting{" "}
            <strong>
              {parts.length === 4
                ? "all four parts"
                : parts.map((p) => `Part ${p}`).join(", ")}
            </strong>
            . Every part must pass on its own; a high total does not rescue a
            failed part.
          </li>
          <li>
            When the time runs out the paper is handed in as it stands. What you
            answered is marked.
          </li>
        </ul>

        {error && (
          <p className="mt-5 rounded-xl bg-[#fbeeea] px-5 py-4 text-[15px] text-[#a8341c]">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={begin}
          disabled={busy || !release}
          className="btn-gold mt-7"
        >
          {busy ? "Opening the paper…" : "Start the exam"}
        </button>
        <p className="mt-3 text-[13.5px] text-ink/50">
          The clock starts the moment you press it.
        </p>
      </div>
    );
  }

  const paper = sitting.paper;
  const shownParts = paper.parts;
  const urgent = remaining < 10 * 60 * 1000;

  return (
    <div>
      {/* The clock, pinned so it is never scrolled away from. */}
      <div className="sticky top-0 z-20 -mx-2 mb-6 rounded-xl border border-ink/10 bg-white/95 px-5 py-3 shadow-card backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
          <div className="flex items-baseline gap-3">
            <span
              className={`font-mono text-[26px] font-bold tabular-nums ${
                urgent ? "text-[#a8341c]" : "text-ink"
              }`}
            >
              {clock(remaining)}
            </span>
            <span className="text-[13px] text-ink/50">left</span>
          </div>

          <div className="flex items-center gap-4 text-[13px] text-ink/55">
            <span>
              {answeredCount} of {questionIds.length} answered
            </span>
            <span className={saving > 0 ? "text-ink/70" : "text-[#1f6f4a]"}>
              {saving > 0 ? "Saving…" : "Saved"}
            </span>
          </div>
        </div>

        {error && (
          <p className="mt-2 text-[13.5px] font-semibold text-[#a8341c]">{error}</p>
        )}
      </div>

      {/* Part tabs. */}
      <div className="mb-7 flex flex-wrap gap-2">
        {shownParts.map((spec) => (
          <button
            key={spec.part}
            type="button"
            onClick={() => setActivePart(spec.part)}
            className={`rounded-lg px-4 py-2 text-[14px] font-semibold transition ${
              activePart === spec.part
                ? "bg-ink text-white"
                : "border border-ink/15 bg-white text-ink/70 hover:border-ink/35"
            }`}
          >
            Part {spec.part} · {spec.marks} marks
          </button>
        ))}
      </div>

      {shownParts
        .filter((spec) => spec.part === activePart)
        .map((spec) => (
          <section key={spec.part}>
            <h2 className="text-[22px] font-bold">
              Part {spec.part} — {spec.title}
            </h2>
            <p className="mt-1 text-[13.5px] font-semibold uppercase tracking-[0.1em] text-gold-700">
              {spec.marks} marks · {spec.passPct}% to pass · allow{" "}
              {spec.allowMinutes} minutes
            </p>
            <p className="mt-3 max-w-[70ch] text-[15.5px] leading-relaxed text-ink/70">
              {spec.instruction}
            </p>

            {/* ---------------------------------------------------- Part A */}
            {spec.part === "A" && (
              <div className="mt-8 space-y-6">
                {paper.a.map((q) => (
                  <div key={q.id} className="card">
                    <div className="flex items-baseline justify-between gap-4">
                      <h3 className="font-mono text-[13px] font-bold tracking-[0.1em] text-ink/55">
                        {q.id}
                      </h3>
                      <span className="text-[12.5px] text-ink/45">
                        {q.marks} marks
                      </span>
                    </div>
                    <p className="mt-3 text-[16px] leading-relaxed text-ink">
                      {q.facts}
                    </p>

                    <div className="mt-5 grid gap-4 sm:grid-cols-2">
                      <Field label="Filing status">
                        <select
                          value={answers[q.id]?.status ?? ""}
                          onChange={(e) => choose(q.id, { status: e.target.value })}
                          className="select-stiq"
                        >
                          <option value="">Choose…</option>
                          {paper.statuses.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.label}
                            </option>
                          ))}
                        </select>
                      </Field>

                      <Field label="The test that decided it">
                        <select
                          value={answers[q.id]?.test ?? ""}
                          onChange={(e) => choose(q.id, { test: e.target.value })}
                          className="select-stiq"
                        >
                          <option value="">Choose…</option>
                          {paper.tests.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.label}
                            </option>
                          ))}
                        </select>
                      </Field>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ---------------------------------------------------- Part B */}
            {spec.part === "B" && (
              <div className="mt-8 space-y-6">
                {paper.b.map((q) => (
                  <div key={q.id} className="card">
                    <div className="flex items-baseline justify-between gap-4">
                      <h3 className="font-mono text-[13px] font-bold tracking-[0.1em] text-ink/55">
                        {q.id}
                      </h3>
                      <span className="text-[12.5px] text-ink/45">
                        {q.marks} marks
                      </span>
                    </div>
                    <p className="mt-3 text-[16px] leading-relaxed text-ink">
                      {q.facts}
                    </p>

                    <fieldset className="mt-5">
                      <legend className="text-[11.5px] font-bold uppercase tracking-[0.16em] text-ink/55">
                        Is the credit available, and on how many children?
                      </legend>
                      <div className="mt-3 space-y-2">
                        {q.outcomes.map((o) => (
                          <label
                            key={o.id}
                            className={`flex cursor-pointer gap-3 rounded-xl border p-4 text-[15px] leading-relaxed transition ${
                              answers[q.id]?.outcome === o.id
                                ? "border-gold-500 bg-gold-50"
                                : "border-ink/12 bg-white hover:border-ink/30"
                            }`}
                          >
                            <input
                              type="radio"
                              name={q.id}
                              value={o.id}
                              checked={answers[q.id]?.outcome === o.id}
                              onChange={() => choose(q.id, { outcome: o.id })}
                              className="mt-1 h-4 w-4 shrink-0 accent-[#d8b038]"
                            />
                            <span>{o.label}</span>
                          </label>
                        ))}
                      </div>
                    </fieldset>

                    <div className="mt-5 max-w-[520px]">
                      <Field label="Which test or rule decided it">
                        <select
                          value={answers[q.id]?.rule ?? ""}
                          onChange={(e) => choose(q.id, { rule: e.target.value })}
                          className="select-stiq"
                        >
                          <option value="">Choose…</option>
                          {paper.rules.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.label}
                            </option>
                          ))}
                        </select>
                      </Field>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ---------------------------------------------------- Part C */}
            {spec.part === "C" && paper.c && (
              <div className="mt-8">
                <div className="card-quiet">
                  <h3 className="text-[18px] font-bold">{paper.c.heading}</h3>
                  <p className="mt-3 text-[15.5px] leading-relaxed text-ink/75">
                    {paper.c.client}
                  </p>

                  <dl className="mt-5 space-y-3">
                    {paper.c.documents.map((d) => (
                      <div
                        key={d.doc}
                        className="rounded-xl border border-ink/10 bg-white p-4"
                      >
                        <dt className="text-[14px] font-bold text-ink">{d.doc}</dt>
                        <dd className="mt-1 font-mono text-[13.5px] leading-relaxed text-ink/70">
                          {d.details}
                        </dd>
                      </div>
                    ))}
                  </dl>

                  <p className="mt-5 border-l-2 border-gold-500 pl-4 text-[15.5px] italic leading-relaxed text-ink/75">
                    What they said at intake: {paper.c.said}
                  </p>
                </div>

                <div className="mt-6 space-y-6">
                  {paper.c.questions.map((q) => (
                    <Written
                      key={q.id}
                      q={q}
                      value={answers[q.id]?.text ?? ""}
                      onChange={(text) => type(q.id, text)}
                      onBlur={() => flush(q.id)}
                    />
                  ))}
                </div>

                <Attachments
                  files={files}
                  onAdded={(f) => setFiles((prev) => [f, ...prev])}
                  onError={setError}
                />
              </div>
            )}

            {/* ---------------------------------------------------- Part D */}
            {spec.part === "D" && (
              <div className="mt-8 space-y-6">
                {paper.d.map((q) => (
                  <Written
                    key={q.id}
                    q={q}
                    value={answers[q.id]?.text ?? ""}
                    onChange={(text) => type(q.id, text)}
                    onBlur={() => flush(q.id)}
                  />
                ))}
              </div>
            )}
          </section>
        ))}

      {/* Hand in. */}
      <div className="mt-12 rounded-2xl border border-ink/10 bg-ice p-7">
        <h2 className="text-[18px] font-bold">Before you hand it in</h2>
        <ul className="mt-3 space-y-2 pl-5 text-[15px] leading-relaxed text-ink/70 [list-style:disc]">
          <li>Every question in Part A has a status and a test named.</li>
          <li>Every question in Part B says which test or rule decided it.</li>
          <li>Part C has two file notes, each with a date.</li>
        </ul>
        <p className="mt-4 text-[15px] text-ink/70">
          You have answered {answeredCount} of {questionIds.length}.
        </p>

        {!confirming ? (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="btn-outline mt-5"
          >
            Hand in the paper
          </button>
        ) : (
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <span className="text-[15px] font-semibold text-ink">
              Hand it in? You cannot reopen it.
            </span>
            <button
              type="button"
              onClick={() => handIn("student")}
              disabled={phase === "handing-in"}
              className="btn-gold"
            >
              {phase === "handing-in" ? "Handing in…" : "Yes, hand it in"}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="btn-outline"
            >
              Keep working
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ fragments -- */

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-[11.5px] font-bold uppercase tracking-[0.16em] text-ink/55">
        {label}
      </span>
      <span className="mt-2 block">{children}</span>
    </label>
  );
}

function Written({
  q,
  value,
  onChange,
  onBlur,
}: {
  q: QuestionWritten;
  value: string;
  onChange: (text: string) => void;
  onBlur: () => void;
}) {
  return (
    <div className="card">
      <div className="flex items-baseline justify-between gap-4">
        <h3 className="font-mono text-[13px] font-bold tracking-[0.1em] text-ink/55">
          {q.id}
        </h3>
        <span className="text-[12.5px] text-ink/45">{q.marks} marks</span>
      </div>
      <p className="mt-3 text-[16px] leading-relaxed text-ink">{q.prompt}</p>
      {q.hint && (
        <p className="mt-1.5 text-[14px] italic text-ink/55">{q.hint}</p>
      )}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        rows={q.rows}
        className="mt-4 w-full rounded-xl border border-ink/15 bg-white px-4 py-3 text-[15.5px] leading-relaxed text-ink outline-none transition focus:border-gold-500"
        placeholder="Your answer"
      />
    </div>
  );
}

function Attachments({
  files,
  onAdded,
  onError,
}: {
  files: AttachedFile[];
  onAdded: (f: AttachedFile) => void;
  onError: (message: string | null) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function upload(file: File) {
    setBusy(true);
    onError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/academy/exam/upload", {
        method: "POST",
        body: form,
      });
      const data = await res.json().catch(() => ({}));
      if (!data?.ok) {
        onError(data?.error ?? "That file did not upload.");
        return;
      }
      onAdded(data.file as AttachedFile);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div className="mt-8 rounded-2xl border border-dashed border-ink/20 bg-white p-6">
      <h3 className="text-[16px] font-bold">Attach your working (optional)</h3>
      <p className="mt-2 max-w-[58ch] text-[14.5px] leading-relaxed text-ink/65">
        If you prepared the return in the software or on paper, add it here — a
        PDF or a photo, up to 4 MB. The answer boxes above still carry the
        marks; this is the evidence beside them.
      </p>

      {files.length > 0 && (
        <ul className="mt-4 space-y-1.5">
          {files.map((f) => (
            <li key={f.id} className="text-[14px] text-ink/70">
              <span className="font-semibold text-ink">{f.fileName}</span>{" "}
              <span className="text-ink/45">attached</span>
            </li>
          ))}
        </ul>
      )}

      <input
        ref={input}
        type="file"
        accept="application/pdf,image/jpeg,image/png,image/webp,image/heic"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void upload(file);
        }}
      />
      <button
        type="button"
        onClick={() => input.current?.click()}
        disabled={busy}
        className="btn-outline mt-4 px-6 py-2.5 text-[15px]"
      >
        {busy ? "Uploading…" : "Choose a file"}
      </button>
    </div>
  );
}
