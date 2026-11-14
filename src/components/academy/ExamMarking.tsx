"use client";

import { useState } from "react";

/**
 * Marking a handed-in paper, and deciding who may sit one.
 *
 * Built around what marking actually is: reading an answer with the model
 * answer beside it and writing a number. So each question shows the
 * student's words, then what the key says the answer is, then how the marks
 * break down, then one small box. Nothing is hidden behind a click, because
 * the thing being optimised is Lashanda getting through five papers in an
 * evening.
 *
 * Marks save per paper rather than per keystroke: she works down the page and
 * presses save once. The result — and the certificate, if all four parts
 * passed — comes back from the server, because the server is where the pass
 * bars live.
 */

type PartTotal = {
  part: string;
  awarded: number;
  available: number;
  needed: number;
  passed: boolean;
  marked: boolean;
};

export type MarkingPaper = {
  attemptId: string;
  studentName: string;
  paper: "A" | "B";
  parts: string[];
  submittedAt: string;
  ranOutOfTime: boolean;
  totals: PartTotal[];
  auto: {
    part: string;
    id: string;
    marks: number;
    awarded: number;
    facts: string;
    note: string;
    gave: string;
  }[];
  written: {
    part: "C" | "D";
    id: string;
    marks: number;
    prompt: string;
    hint: string | null;
    answer: string;
    model: string;
    awards: string;
    mark: number | null;
  }[];
  files: { id: string; fileName: string }[];
  notes: string;
  result: "pass" | "retake" | null;
  markedAt: string | null;
};

export type RosterRow = {
  studentId: string;
  name: string;
  email: string;
  cohort: string;
  sittings: number;
  failedParts: string[];
  passedAll: boolean;
  awaitingMarking: boolean;
  release: { id: string; paper: "A" | "B"; parts: string[] } | null;
  certificate: {
    number: string;
    route: string;
    passedAt: string;
    revoked: boolean;
  } | null;
};

async function manage(body: unknown) {
  const res = await fetch("/api/academy/exam/manage", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json().catch(() => ({ ok: false }));
}

function when(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function ExamMarking({
  papers,
  roster,
  principles,
  deductions,
}: {
  papers: MarkingPaper[];
  roster: RosterRow[];
  principles: string[];
  deductions: string[];
}) {
  const [open, setOpen] = useState<string | null>(
    papers.find((p) => !p.markedAt)?.attemptId ?? null
  );

  const unmarked = papers.filter((p) => !p.markedAt);

  return (
    <div className="mt-10 space-y-14">
      {/* ------------------------------------------------------- to mark -- */}
      <section>
        <h2 className="text-[20px] font-bold">
          To mark{" "}
          <span className="text-ink/45">
            ({unmarked.length} of {papers.length})
          </span>
        </h2>

        {papers.length === 0 && (
          <p className="mt-4 text-[15.5px] text-ink/60">
            Nothing has been handed in yet.
          </p>
        )}

        <div className="mt-5 space-y-4">
          {papers.map((paper) => (
            <PaperCard
              key={paper.attemptId}
              paper={paper}
              open={open === paper.attemptId}
              onToggle={() =>
                setOpen(open === paper.attemptId ? null : paper.attemptId)
              }
              principles={principles}
              deductions={deductions}
            />
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------- release -- */}
      <section>
        <h2 className="text-[20px] font-bold">Who may sit it</h2>
        <p className="mt-2 max-w-[70ch] text-[15px] leading-relaxed text-ink/65">
          Releasing a paper is what lets somebody start. A first sitting is
          Paper A, all four parts. A retake is Paper B, seven days later, and
          only the parts they failed — which are filled in for you below.
        </p>

        <div className="mt-5 space-y-3">
          {roster.map((row) => (
            <RosterCard key={row.studentId} row={row} />
          ))}
          {roster.length === 0 && (
            <p className="text-[15px] text-ink/60">No students on the roster.</p>
          )}
        </div>
      </section>
    </div>
  );
}

/* ------------------------------------------------------------- a paper -- */

function PaperCard({
  paper,
  open,
  onToggle,
  principles,
  deductions,
}: {
  paper: MarkingPaper;
  open: boolean;
  onToggle: () => void;
  principles: string[];
  deductions: string[];
}) {
  const [marks, setMarks] = useState<Record<string, string>>(() => {
    const seed: Record<string, string> = {};
    for (const q of paper.written) {
      seed[q.id] = q.mark === null ? "" : String(q.mark);
    }
    return seed;
  });
  const [notes, setNotes] = useState(paper.notes);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const running = paper.written.reduce((sum, q) => {
    const n = Number(marks[q.id]);
    return sum + (Number.isFinite(n) ? n : 0);
  }, 0);

  const everyMarked = paper.written.every((q) => marks[q.id] !== "");

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const payload: Record<string, number> = {};
      for (const q of paper.written) {
        const n = Number(marks[q.id]);
        if (marks[q.id] === "" || !Number.isFinite(n)) continue;
        payload[q.id] = Math.max(0, Math.min(q.marks, n));
      }

      const data = await manage({
        action: "mark",
        attemptId: paper.attemptId,
        marks: payload,
        notes,
      });

      if (!data?.ok) {
        setError(data?.error ?? "Those marks did not save.");
        return;
      }
      setSaved(
        data.result === "pass"
          ? "Passed — certificate issued."
          : data.result === "retake"
            ? `Retake: ${(data.failedParts ?? []).map((p: string) => `Part ${p}`).join(", ")}`
            : "Saved. Still some questions to mark."
      );
    } finally {
      setBusy(false);
    }
  }

  async function openFile(fileId: string) {
    const data = await manage({ action: "file-url", fileId });
    if (data?.ok && data.url) window.open(data.url, "_blank", "noopener");
  }

  return (
    <article className="rounded-2xl border border-ink/12 bg-white">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full flex-wrap items-baseline gap-x-4 gap-y-1 px-6 py-5 text-left"
      >
        <span className="text-[17px] font-bold text-ink">{paper.studentName}</span>
        <span className="text-[14px] text-ink/55">
          Paper {paper.paper} · {paper.parts.map((p) => `Part ${p}`).join(", ")}
        </span>
        <span className="text-[14px] text-ink/45">{when(paper.submittedAt)}</span>
        {paper.ranOutOfTime && (
          <span className="text-[13px] font-semibold text-[#a8341c]">
            time ran out
          </span>
        )}
        <span
          className={`ml-auto text-[14px] font-semibold ${
            paper.result === "pass"
              ? "text-[#1f6f4a]"
              : paper.result === "retake"
                ? "text-[#a8341c]"
                : "text-gold-700"
          }`}
        >
          {paper.result === "pass"
            ? "Passed"
            : paper.result === "retake"
              ? "Retake"
              : "Needs marking"}
        </span>
      </button>

      {open && (
        <div className="border-t border-ink/10 px-6 py-7">
          {/* Part totals so far. */}
          <div className="flex flex-wrap gap-2">
            {paper.totals.map((t) => (
              <span
                key={t.part}
                className={`rounded-lg px-3 py-1.5 text-[13.5px] font-semibold ${
                  !t.marked
                    ? "bg-ink/5 text-ink/55"
                    : t.passed
                      ? "bg-[#e8f4ed] text-[#17543a]"
                      : "bg-[#fbeeea] text-[#a8341c]"
                }`}
              >
                Part {t.part} {t.marked ? `${t.awarded}/${t.available}` : "—"} ·
                needs {t.needed}
              </span>
            ))}
          </div>

          {/* How Parts A and B went, question by question. */}
          {paper.auto.length > 0 && (
            <details className="mt-6 rounded-xl border border-ink/10 bg-ice p-5">
              <summary className="cursor-pointer text-[15px] font-bold">
                Parts A and B, marked against the key
              </summary>
              <ul className="mt-4 space-y-3">
                {paper.auto.map((q) => (
                  <li key={`${q.part}${q.id}`} className="text-[14.5px]">
                    <div className="flex items-baseline gap-3">
                      <span className="font-mono font-bold text-ink/60">
                        {q.id}
                      </span>
                      <span
                        className={`font-semibold ${
                          q.awarded === q.marks
                            ? "text-[#1f6f4a]"
                            : q.awarded === 0
                              ? "text-[#a8341c]"
                              : "text-gold-700"
                        }`}
                      >
                        {q.awarded}/{q.marks}
                      </span>
                      <span className="text-ink/50">they chose: {q.gave}</span>
                    </div>
                    {q.awarded < q.marks && q.note && (
                      <p className="mt-1 max-w-[76ch] text-[13.5px] leading-relaxed text-ink/60">
                        {q.note}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </details>
          )}

          {/* Attachments. */}
          {paper.files.length > 0 && (
            <div className="mt-6">
              <h4 className="text-[11.5px] font-bold uppercase tracking-[0.16em] text-ink/55">
                Attached
              </h4>
              <ul className="mt-2 flex flex-wrap gap-2">
                {paper.files.map((f) => (
                  <li key={f.id}>
                    <button
                      type="button"
                      onClick={() => openFile(f.id)}
                      className="rounded-lg border border-ink/15 bg-white px-4 py-2 text-[14px] font-semibold text-ink hover:border-ink/40"
                    >
                      {f.fileName}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* The written questions. */}
          <div className="mt-8 space-y-6">
            {paper.written.map((q) => (
              <div
                key={q.id}
                className="rounded-xl border border-ink/12 bg-white p-5"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <h4 className="font-mono text-[13px] font-bold tracking-[0.1em] text-ink/55">
                    {q.id} · Part {q.part}
                  </h4>
                  <span className="text-[12.5px] text-ink/45">
                    {q.marks} marks
                  </span>
                </div>

                <p className="mt-2 text-[15.5px] font-semibold leading-relaxed text-ink">
                  {q.prompt}
                </p>

                <div className="mt-4 rounded-lg border border-ink/10 bg-white p-4">
                  <h5 className="text-[11.5px] font-bold uppercase tracking-[0.16em] text-ink/45">
                    Their answer
                  </h5>
                  <p className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed text-ink">
                    {q.answer.trim() || (
                      <span className="italic text-ink/40">Left blank.</span>
                    )}
                  </p>
                </div>

                <div className="mt-3 rounded-lg bg-ice p-4">
                  <h5 className="text-[11.5px] font-bold uppercase tracking-[0.16em] text-gold-700">
                    The key
                  </h5>
                  <p className="mt-2 text-[14.5px] leading-relaxed text-ink/80">
                    {q.model}
                  </p>
                  <p className="mt-2 text-[13.5px] leading-relaxed text-ink/60">
                    {q.awards}
                  </p>
                </div>

                <div className="mt-4 flex items-center gap-3">
                  <label className="text-[11.5px] font-bold uppercase tracking-[0.16em] text-ink/55">
                    Mark
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={q.marks}
                    step={1}
                    value={marks[q.id] ?? ""}
                    onChange={(e) =>
                      setMarks((prev) => ({ ...prev, [q.id]: e.target.value }))
                    }
                    className="w-20 rounded-lg border border-ink/15 bg-white px-3 py-2 text-[15px] tabular-nums text-ink outline-none focus:border-gold-500"
                  />
                  <span className="text-[14px] text-ink/50">of {q.marks}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Notes for the candidate. */}
          <div className="mt-7">
            <label className="block text-[11.5px] font-bold uppercase tracking-[0.16em] text-ink/55">
              Notes for the candidate — specific, and tied to a question number
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="mt-2 w-full rounded-xl border border-ink/15 bg-white px-4 py-3 text-[15px] leading-relaxed text-ink outline-none focus:border-gold-500"
              placeholder="A student who passed still needs to know which two answers were weak."
            />
          </div>

          <details className="mt-6 text-[14px] text-ink/65">
            <summary className="cursor-pointer font-semibold">
              Marking principles and the Part C deductions
            </summary>
            <ol className="mt-3 space-y-2 pl-5 [list-style:decimal]">
              {principles.map((p) => (
                <li key={p} className="leading-relaxed">
                  {p}
                </li>
              ))}
            </ol>
            <h5 className="mt-4 text-[11.5px] font-bold uppercase tracking-[0.16em] text-[#a8341c]">
              Automatic deductions, Part C
            </h5>
            <ul className="mt-2 space-y-1.5 pl-5 [list-style:disc]">
              {deductions.map((d) => (
                <li key={d} className="leading-relaxed">
                  {d}
                </li>
              ))}
            </ul>
          </details>

          <div className="mt-7 flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={save}
              disabled={busy}
              className="btn-gold"
            >
              {busy ? "Saving…" : "Save marks"}
            </button>
            <span className="text-[14.5px] text-ink/60">
              Written total so far: <strong>{running}</strong> of 40
              {!everyMarked && " · some questions still blank"}
            </span>
          </div>

          {saved && (
            <p className="mt-4 rounded-xl bg-[#f1f8f4] px-5 py-3.5 text-[15px] font-semibold text-[#17543a]">
              {saved}
            </p>
          )}
          {error && (
            <p className="mt-4 rounded-xl bg-[#fbeeea] px-5 py-3.5 text-[15px] text-[#a8341c]">
              {error}
            </p>
          )}
        </div>
      )}
    </article>
  );
}

/* ------------------------------------------------------------ a student -- */

function RosterCard({ row }: { row: RosterRow }) {
  const retake = row.sittings > 0 && row.failedParts.length > 0;

  const [paper, setPaper] = useState<"A" | "B">(retake ? "B" : "A");
  const [parts, setParts] = useState<string[]>(
    retake && row.failedParts.length ? row.failedParts : ["A", "B", "C", "D"]
  );
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function toggle(part: string) {
    setParts((prev) =>
      prev.includes(part) ? prev.filter((p) => p !== part) : [...prev, part]
    );
  }

  async function act(body: Record<string, unknown>, done: string) {
    setBusy(true);
    setMessage(null);
    try {
      const data = await manage(body);
      if (!data?.ok) {
        setMessage(data?.error ?? "That did not work.");
        return;
      }
      // A release that went through but could not be emailed has to say so,
      // or she will assume the student has been told.
      setMessage(data.emailError ? `${done} ${data.emailError}` : done);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-ink/12 bg-white p-6">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h3 className="text-[16.5px] font-bold">{row.name}</h3>
        <span className="text-[13.5px] text-ink/50">{row.email}</span>
        <span className="ml-auto text-[13.5px] font-semibold">
          {row.certificate && !row.certificate.revoked ? (
            <span className="text-[#1f6f4a]">
              Certified · {row.certificate.number}
            </span>
          ) : row.awaitingMarking ? (
            <span className="text-gold-700">Awaiting marking</span>
          ) : row.sittings === 0 ? (
            <span className="text-ink/45">Not sat</span>
          ) : (
            <span className="text-[#a8341c]">
              {row.failedParts.map((p) => `Part ${p}`).join(", ")} outstanding
            </span>
          )}
        </span>
      </div>

      {row.release ? (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl bg-ice px-5 py-3.5">
          <span className="text-[14.5px] text-ink/75">
            Released: Paper {row.release.paper},{" "}
            {row.release.parts.map((p) => `Part ${p}`).join(", ")} — not started
            yet.
          </span>
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              act(
                { action: "revoke-release", releaseId: row.release!.id },
                "Release withdrawn. Reload to see it go."
              )
            }
            className="ml-auto text-[14px] font-semibold text-[#a8341c] underline"
          >
            Withdraw
          </button>
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap items-end gap-4">
          <label className="block">
            <span className="block text-[11.5px] font-bold uppercase tracking-[0.16em] text-ink/55">
              Paper
            </span>
            <select
              value={paper}
              onChange={(e) => setPaper(e.target.value as "A" | "B")}
              className="select-stiq mt-1.5 w-[170px]"
            >
              <option value="A">Paper A</option>
              <option value="B">Paper B — retake</option>
            </select>
          </label>

          <div>
            <span className="block text-[11.5px] font-bold uppercase tracking-[0.16em] text-ink/55">
              Parts
            </span>
            <div className="mt-1.5 flex gap-2">
              {["A", "B", "C", "D"].map((part) => (
                <button
                  key={part}
                  type="button"
                  onClick={() => toggle(part)}
                  className={`rounded-lg px-3.5 py-2 text-[14px] font-semibold transition ${
                    parts.includes(part)
                      ? "bg-ink text-white"
                      : "border border-ink/15 bg-white text-ink/55"
                  }`}
                >
                  {part}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            disabled={busy || parts.length === 0}
            onClick={() =>
              act(
                {
                  action: "release",
                  studentId: row.studentId,
                  paper,
                  parts,
                },
                "Released, and they have been emailed. They can start it whenever they are ready."
              )
            }
            className="btn-outline px-6 py-2.5 text-[15px]"
          >
            Release
          </button>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-ink/8 pt-4 text-[14px]">
        {!row.certificate && (
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              act(
                { action: "record-paper-pass", studentId: row.studentId },
                "Recorded. Their certificate is ready to download."
              )
            }
            className="font-semibold text-ink underline"
          >
            Record a pass from the paper sitting
          </button>
        )}

        {row.certificate && !row.certificate.revoked && (
          <>
            <a
              href={`/api/academy/certificate?student=${row.studentId}`}
              className="font-semibold text-ink underline"
            >
              Download their certificate
            </a>
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                act(
                  { action: "revoke-certificate", studentId: row.studentId },
                  "Withdrawn."
                )
              }
              className="font-semibold text-[#a8341c] underline"
            >
              Withdraw it
            </button>
          </>
        )}

        {row.certificate?.revoked && (
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              act(
                { action: "restore-certificate", studentId: row.studentId },
                "Restored."
              )
            }
            className="font-semibold text-ink underline"
          >
            Put the certificate back
          </button>
        )}
      </div>

      {message && (
        <p className="mt-3 text-[14px] font-semibold text-ink/70">{message}</p>
      )}
    </div>
  );
}
