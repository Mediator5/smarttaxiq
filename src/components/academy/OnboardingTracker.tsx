"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { OnboardingRow } from "@/lib/academy/store";

/**
 * The preparer onboarding checklist.
 *
 * Four things have to be true before somebody prepares a return under the
 * practice's PTIN, and before this page they were four things remembered in
 * four different places. This is the one screen that answers "is she cleared
 * or not" without opening a filing cabinet.
 *
 * Deliberately not an upload form. Every control here records that a document
 * was received or sighted; none of them accepts the document. The reasoning is
 * in supabase/academy.sql above the table, and the short version is that
 * holding an SSN or a licence image behind a one-factor emailed code would not
 * satisfy Michigan's SSN Privacy Act, while holding neither needs nothing.
 *
 * Every write goes to /api/academy/onboarding, which re-checks the
 * instructor role against the database. This component being reachable only
 * from a gated page is presentation, not security.
 */

type Check = {
  field:
    | "ptin_verified_at"
    | "w9_received_at"
    | "id_sighted_at"
    | "security_plan_signed_at";
  label: string;
  /** What ticking it actually asserts. Shown under the box, because a tick
   *  somebody misunderstood is worse than no tick at all. */
  means: string;
};

const CHECKS: Check[] = [
  {
    field: "ptin_verified_at",
    label: "PTIN verified",
    means:
      "You looked the number up in the IRS directory of credentialled preparers and it matched this person.",
  },
  {
    field: "w9_received_at",
    label: "W-9 received",
    means:
      "A completed W-9 is on file with your filing service — not here. You will need it to issue their 1099-NEC in January.",
  },
  {
    field: "id_sighted_at",
    label: "Photo ID sighted",
    means:
      "You saw a government photo ID and it matched the name above. No copy is kept, here or anywhere.",
  },
  {
    field: "security_plan_signed_at",
    label: "Security plan signed",
    means:
      "They have read your written information security plan and signed the acknowledgement. The IRS expects every preparer in the office to have done this.",
  },
];

/** Today in the browser's own timezone. Intl's en-CA locale is ISO order, and
 *  it uses local time where toISOString() would silently shift the date for
 *  anyone west of Greenwich late in the evening. */
function today() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function pretty(date: string | null) {
  if (!date) return null;
  const [y, m, d] = date.split("-").map(Number);
  if (!y || !m || !d) return date;
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function OnboardingTracker({
  rows,
  rosterSuggestions,
}: {
  rows: OnboardingRow[];
  /** People on the Academy roster who aren't being tracked yet, so adding a
   *  graduate is one click rather than retyping their address. */
  rosterSuggestions: { email: string; first_name: string; last_name: string | null }[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  async function send(payload: Record<string, unknown>, key: string) {
    setBusy(key);
    setError(null);
    setDone(null);
    try {
      const res = await fetch("/api/academy/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };
      if (!res.ok || data.ok === false) {
        setError(data.error ?? "That didn't save.");
        return false;
      }
      router.refresh();
      return true;
    } catch {
      setError("Couldn't reach the server. Check your connection.");
      return false;
    } finally {
      setBusy(null);
    }
  }

  async function addPerson(e: React.FormEvent) {
    e.preventDefault();
    const ok = await send({ action: "add", email, firstName, lastName }, "add");
    if (ok) {
      setDone(`${firstName || email} added to the checklist.`);
      setEmail("");
      setFirstName("");
      setLastName("");
    }
  }

  const live = rows.filter((r) => !r.archived);
  const archived = rows.filter((r) => r.archived);
  const cleared = live.filter((r) =>
    CHECKS.every((c) => r[c.field] !== null)
  ).length;

  const labelClass =
    "block text-[11.5px] font-bold uppercase tracking-[0.16em] text-ink/55";
  const inputClass =
    "mt-2 w-full rounded-lg border border-ink/15 bg-white px-4 py-3 text-[15.5px] text-ink outline-none transition focus:border-gold-500";

  return (
    <div className="space-y-12">
      {/* --------------------------------------------- what this is not -- */}
      <section className="rounded-2xl border border-ink/10 bg-ice p-6">
        <h2 className="text-[17px] font-bold">
          Nothing sensitive is stored on this page
        </h2>
        <p className="mt-3 max-w-[68ch] text-[15px] leading-relaxed text-ink/70">
          There is no upload button here, and that is on purpose. A tick below
          records that you received or saw a document, and on what day. The
          documents stay where they already are:
        </p>
        <ul className="mt-4 max-w-[68ch] space-y-2.5 text-[15px] leading-relaxed text-ink/70">
          <li>
            <strong className="text-ink">The W-9</strong> — collect it through a
            filing service such as Track1099 or TaxBandits, or the client portal
            in your tax software. That is where the Social Security or EIN
            number belongs, because those services are built to hold it and are
            insured for doing so.
          </li>
          <li>
            <strong className="text-ink">Photo ID</strong> — look at it on a
            video call and tick the box. Form I-9 identity verification applies
            to employees, not 1099 contractors, so you are not required to keep
            a copy. A stored licence image is the riskiest thing you could hold
            and the hardest to justify holding.
          </li>
          <li>
            <strong className="text-ink">The PTIN</strong> — just a number. Type
            it in and check it against the{" "}
            <a
              href="https://irs.treasury.gov/rpo/rpo.jsf"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-ink underline underline-offset-2 hover:text-gold-700"
            >
              IRS directory
            </a>
            .
          </li>
        </ul>
        <p className="mt-4 max-w-[68ch] text-[14px] leading-relaxed text-ink/55">
          Michigan&rsquo;s Social Security Number Privacy Act requires
          multi-factor authentication on any system an SSN can be reached
          through. Academy sign-in is a one-time emailed code, which is one
          factor. Holding no SSN is what keeps this page lawful as it stands.
        </p>
      </section>

      {/* -------------------------------------------------- the people --- */}
      <section>
        <h2 className="text-[20px] font-bold">
          Preparers
          <span className="ml-3 text-[15px] font-normal text-ink/50">
            {cleared} of {live.length} fully cleared
          </span>
        </h2>

        {live.length === 0 ? (
          <p className="mt-4 max-w-[62ch] rounded-2xl border border-dashed border-ink/20 px-5 py-6 text-[15px] leading-relaxed text-ink/55">
            Nobody on the checklist yet. Add the preparers joining the practice
            below — including yourself, if you have not kept a record of your
            own PTIN and security plan anywhere else.
          </p>
        ) : (
          <div className="mt-5 space-y-5">
            {live.map((row) => (
              <PersonCard
                key={row.id}
                row={row}
                busy={busy}
                onSend={send}
              />
            ))}
          </div>
        )}
      </section>

      {/* ---------------------------------------------------- add one ---- */}
      <section>
        <h2 className="text-[20px] font-bold">Add a preparer</h2>
        <p className="mt-2 max-w-[62ch] text-[15px] leading-relaxed text-ink/65">
          They get no email from this, and adding them here does not give them
          Academy access — that is the Roster tab.
        </p>

        {rosterSuggestions.length > 0 && (
          <div className="mt-5 rounded-2xl border border-ink/10 bg-white p-5">
            <p className={labelClass}>Already on the Academy roster</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {rosterSuggestions.map((s) => (
                <button
                  key={s.email}
                  type="button"
                  disabled={busy !== null}
                  onClick={() =>
                    send(
                      {
                        action: "add",
                        email: s.email,
                        firstName: s.first_name,
                        lastName: s.last_name ?? "",
                      },
                      s.email
                    )
                  }
                  className="rounded-lg border border-ink/15 px-4 py-2 text-[14.5px] text-ink/75 transition hover:border-gold-500 hover:text-ink disabled:opacity-50"
                >
                  {busy === s.email ? "…" : `+ ${s.first_name} ${s.last_name ?? ""}`.trim()}
                </button>
              ))}
            </div>
          </div>
        )}

        <form
          onSubmit={addPerson}
          className="mt-5 rounded-2xl border border-ink/10 bg-white p-6"
          noValidate
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="o-first" className={labelClass}>
                First name
              </label>
              <input
                id="o-first"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="o-last" className={labelClass}>
                Last name{" "}
                <span className="font-normal normal-case tracking-normal text-ink/45">
                  (optional)
                </span>
              </label>
              <input
                id="o-last"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div className="mt-4">
            <label htmlFor="o-email" className={labelClass}>
              Email address
            </label>
            <input
              id="o-email"
              type="email"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={inputClass}
            />
          </div>

          <button
            type="submit"
            disabled={busy !== null || !email || !firstName}
            className="btn-gold mt-6"
          >
            {busy === "add" ? "Adding…" : "Add to checklist"}
          </button>
        </form>
      </section>

      {/* --------------------------------------------------- archived ---- */}
      {archived.length > 0 && (
        <section>
          <button
            type="button"
            onClick={() => setShowArchived((v) => !v)}
            className="text-[15px] font-semibold text-ink/60 underline underline-offset-4 hover:text-ink"
          >
            {showArchived ? "Hide" : "Show"} {archived.length} archived
          </button>

          {showArchived && (
            <div className="mt-5 space-y-3">
              {archived.map((row) => (
                <div
                  key={row.id}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-ink/10 bg-white px-5 py-4 opacity-70"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-ink">
                      {row.first_name} {row.last_name ?? ""}
                    </p>
                    <p className="break-all text-[14px] text-ink/60">
                      {row.email}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() =>
                      send({ action: "restore", id: row.id }, row.id)
                    }
                    className="text-[14px] text-ink/55 underline underline-offset-2 hover:text-ink"
                  >
                    {busy === row.id ? "…" : "Restore"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {done && !error && (
        <p className="rounded-xl bg-mint-50 px-5 py-4 text-[15px] text-mint-800">
          {done}
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="rounded-xl bg-[#fbeeea] px-5 py-4 text-[15px] text-[#a8341c]"
        >
          {error}
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------- one preparer ----- */

function PersonCard({
  row,
  busy,
  onSend,
}: {
  row: OnboardingRow;
  busy: string | null;
  onSend: (payload: Record<string, unknown>, key: string) => Promise<boolean>;
}) {
  const [ptin, setPtin] = useState(row.ptin ?? "");
  const [notes, setNotes] = useState(row.notes ?? "");
  const [open, setOpen] = useState(false);

  const ticked = CHECKS.filter((c) => row[c.field] !== null).length;
  const complete = ticked === CHECKS.length;

  return (
    <div
      className={`rounded-2xl border bg-white p-6 ${
        complete ? "border-mint-300" : "border-ink/10"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[17px] font-bold text-ink">
            {row.first_name} {row.last_name ?? ""}
          </p>
          <p className="break-all text-[14px] text-ink/60">{row.email}</p>
        </div>
        <span
          className={`shrink-0 rounded-full px-3 py-1 text-[12.5px] font-bold ${
            complete
              ? "bg-mint-50 text-mint-800"
              : "bg-gold-100 text-gold-700"
          }`}
        >
          {complete ? "Cleared to prepare" : `${ticked} of ${CHECKS.length}`}
        </span>
      </div>

      {/* ------------------------------------------------------- PTIN --- */}
      <div className="mt-6 flex flex-wrap items-end gap-3">
        <div className="min-w-[200px]">
          <label
            htmlFor={`ptin-${row.id}`}
            className="block text-[11.5px] font-bold uppercase tracking-[0.16em] text-ink/55"
          >
            PTIN
          </label>
          <input
            id={`ptin-${row.id}`}
            value={ptin}
            onChange={(e) => setPtin(e.target.value)}
            placeholder="P01234567"
            className="mt-2 w-full rounded-lg border border-ink/15 bg-white px-4 py-2.5 font-mono text-[15px] text-ink outline-none transition focus:border-gold-500"
          />
        </div>
        {ptin.trim() !== (row.ptin ?? "") && (
          <button
            type="button"
            disabled={busy !== null}
            onClick={() =>
              onSend({ action: "save", id: row.id, ptin }, `ptin-${row.id}`)
            }
            className="btn-outline px-5 py-2.5 text-[14px]"
          >
            {busy === `ptin-${row.id}` ? "Saving…" : "Save PTIN"}
          </button>
        )}
      </div>

      {/* ----------------------------------------------------- checks --- */}
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {CHECKS.map((check) => {
          const date = row[check.field];
          const key = `${check.field}-${row.id}`;
          return (
            <div
              key={check.field}
              className={`rounded-xl border px-4 py-4 ${
                date ? "border-mint-300 bg-mint-50/60" : "border-ink/12"
              }`}
            >
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={date !== null}
                  disabled={busy !== null}
                  onChange={() =>
                    onSend(
                      {
                        action: "save",
                        id: row.id,
                        [check.field]: date ? null : today(),
                      },
                      key
                    )
                  }
                  className="mt-0.5 h-[18px] w-[18px] shrink-0 accent-[#1f6f4a]"
                />
                <span className="min-w-0">
                  <span className="block text-[15px] font-semibold text-ink">
                    {check.label}
                  </span>
                  <span className="mt-1 block text-[13.5px] text-ink/55">
                    {date ? pretty(date) : "Not yet"}
                  </span>
                </span>
              </label>
              <p className="mt-3 text-[13px] leading-relaxed text-ink/55">
                {check.means}
              </p>
            </div>
          );
        })}
      </div>

      {/* ------------------------------------------------------ notes --- */}
      <div className="mt-5">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="text-[14px] font-semibold text-ink/60 underline underline-offset-4 hover:text-ink"
        >
          {open ? "Hide note" : row.notes ? "Note" : "Add a note"}
        </button>

        {open && (
          <div className="mt-3">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Anything you need to remember about this person's paperwork. Not a place for Social Security numbers or ID details."
              className="w-full rounded-lg border border-ink/15 bg-white px-4 py-3 text-[15px] leading-relaxed text-ink outline-none transition focus:border-gold-500"
            />
            {notes.trim() !== (row.notes ?? "") && (
              <button
                type="button"
                disabled={busy !== null}
                onClick={() =>
                  onSend(
                    { action: "save", id: row.id, notes },
                    `notes-${row.id}`
                  )
                }
                className="btn-outline mt-3 px-5 py-2.5 text-[14px]"
              >
                {busy === `notes-${row.id}` ? "Saving…" : "Save note"}
              </button>
            )}
          </div>
        )}
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-ink/10 pt-4">
        <p className="text-[13px] text-ink/45">
          Last change{" "}
          {new Date(row.updated_at).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </p>
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => onSend({ action: "archive", id: row.id }, row.id)}
          className="text-[13.5px] text-ink/50 underline underline-offset-2 hover:text-ink"
        >
          {busy === row.id ? "…" : "Archive"}
        </button>
      </div>
    </div>
  );
}
