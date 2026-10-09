"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { OnboardingFile, OnboardingRow } from "@/lib/academy/store";

/**
 * The preparer onboarding checklist.
 *
 * Four things have to be true before somebody prepares a return under the
 * practice's PTIN, and before this page they were four things remembered in
 * four different places. This is the one screen that answers "is she cleared
 * or not" without opening a filing cabinet.
 *
 * This page held no documents until October 2026, when the practice asked for
 * uploads so that a preparer could send everything from one link. It now shows
 * what each person has sent, hands back a sixty-second signed URL to open one,
 * and deletes on request. The files themselves live in a private bucket and
 * never pass through this component.
 *
 * Nothing is deleted automatically — that was the practice's call. The age of
 * every file is therefore shown in days, so a W-9 that has been sitting here
 * since January says so out loud instead of quietly accumulating.
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
      "You have their completed W-9 and it is signed. You will need it to issue their 1099-NEC in January.",
  },
  {
    field: "id_sighted_at",
    label: "Photo ID sighted",
    means:
      "You looked at a government photo ID and it matched the name above.",
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

type Reply = {
  ok?: boolean;
  error?: string;
  url?: string;
  fileName?: string;
  emailed?: boolean;
  days?: number;
  files?: OnboardingFile[];
};

type Send = (
  payload: Record<string, unknown>,
  key: string
) => Promise<Reply | null>;

export default function OnboardingTracker({
  rows,
  files,
  rosterSuggestions,
  planUrl,
}: {
  rows: OnboardingRow[];
  /** Every live uploaded document, across everybody. Split per card below. */
  files: OnboardingFile[];
  /** People on the Academy roster who aren't being tracked yet, so adding a
   *  graduate is one click rather than retyping their address. */
  rosterSuggestions: { email: string; first_name: string; last_name: string | null }[];
  /** Where the written information security plan lives, if it has been set.
   *  Null is a real state with its own prompt, not an empty string. */
  planUrl: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  // Returns the response body on success and null on failure, because the
  // intake action needs the one-time URL out of it. A bare boolean was enough
  // until something had to come back.
  async function send(
    payload: Record<string, unknown>,
    key: string
  ): Promise<Reply | null> {
    setBusy(key);
    setError(null);
    setDone(null);
    try {
      const res = await fetch("/api/academy/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => ({}))) as Reply;
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
      {/* ------------------------------------------------ what is here -- */}
      <section className="rounded-2xl border border-ink/10 bg-ice p-6">
        <h2 className="text-[17px] font-bold">
          Real documents are stored here. Treat this page accordingly.
        </h2>
        <p className="mt-3 max-w-[68ch] text-[15px] leading-relaxed text-ink/70">
          Preparers upload their W-9 and photo ID from their own onboarding
          link, and those files sit in private storage behind your sign-in.
          Between them, a W-9 and a driver&rsquo;s licence are everything
          somebody would need to open credit in that person&rsquo;s name.
        </p>
        <ul className="mt-4 max-w-[68ch] space-y-2.5 text-[15px] leading-relaxed text-ink/70">
          <li>
            <strong className="text-ink">Opening a file</strong> creates a link
            that works for sixty seconds and then stops. There is no address
            that serves these documents, so one cannot be shared by accident.
          </li>
          <li>
            <strong className="text-ink">Nothing is deleted for you.</strong>{" "}
            Every file shows how old it is. Once a W-9 is safely in your filing
            service and you have ticked the box, delete it here &mdash; the
            record that you held it and destroyed it is kept either way.
          </li>
          <li>
            <strong className="text-ink">The PTIN</strong> is just a number.
            Check it against the{" "}
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
        <p className="mt-4 max-w-[68ch] text-[15px] leading-relaxed text-ink/70">
          Two of the four checks are the preparer&rsquo;s to make, not yours:
          their PTIN and their signature. Send them an onboarding link from
          their card and those arrive on their own.
        </p>
        <p className="mt-4 max-w-[68ch] text-[14px] leading-relaxed text-ink/55">
          Because you now hold Social Security numbers, Michigan&rsquo;s Social
          Security Number Privacy Act (MCL 445.84) requires your written
          security plan to cover five things: keeping them confidential,
          barring unlawful disclosure, limiting who can see them, how documents
          holding them are destroyed, and the penalty for breaking the policy.
          Your sign-in is a single emailed code; adding a second step is the
          cheapest real improvement available to this page.
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
                files={files.filter((f) => f.onboarding_id === row.id)}
                busy={busy}
                onSend={send}
                planUrl={planUrl}
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

      {/* ------------------------------------------------ security plan -- */}
      <section>
        <h2 className="text-[20px] font-bold">Your security plan</h2>
        <p className="mt-2 max-w-[62ch] text-[15px] leading-relaxed text-ink/65">
          Paste a link to your written information security plan. Preparers
          read it from their onboarding page and sign the acknowledgement
          there. A Google Drive or Dropbox share link set to{" "}
          <em>anyone with the link can view</em> is fine &mdash; the plan is a
          document about how you work, not a secret.
        </p>
        <PlanLink current={planUrl} busy={busy} onSend={send} />
        {!planUrl && (
          <p className="mt-4 max-w-[62ch] rounded-xl bg-[#faf2d6] px-5 py-4 text-[14.5px] leading-relaxed text-ink/80">
            Do not have one yet? That is the first thing to fix, and not
            because of this page &mdash; a tax practice is required to have
            one. The IRS publishes a free template built for a practice your
            size:{" "}
            <a
              href="https://www.irs.gov/pub/irs-pdf/p5708.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-ink underline underline-offset-2"
            >
              Publication 5708
            </a>
            . An afternoon with it is enough.
          </p>
        )}
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
  files,
  busy,
  onSend,
  planUrl,
}: {
  row: OnboardingRow;
  files: OnboardingFile[];
  busy: string | null;
  onSend: Send;
  planUrl: string | null;
}) {
  const [ptin, setPtin] = useState(row.ptin ?? "");
  const [notes, setNotes] = useState(row.notes ?? "");
  const [open, setOpen] = useState(false);
  // Shown once, right after minting. Only the hash is stored server-side, so
  // this is the only moment the link can be copied — after a reload it is gone
  // and the only way back is a fresh link.
  const [link, setLink] = useState<string | null>(null);
  const [linkWarning, setLinkWarning] = useState<string | null>(null);

  const ticked = CHECKS.filter((c) => row[c.field] !== null).length;
  const complete = ticked === CHECKS.length;
  const intakeExpired = row.intake_expires_at
    ? new Date(row.intake_expires_at).getTime() < Date.now()
    : true;

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

      {/* -------------------------------------------------- documents --- */}
      <Documents row={row} files={files} busy={busy} onSend={onSend} />

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

      {/* ----------------------------------------------------- intake --- */}
      <div className="mt-6 rounded-xl border border-ink/12 bg-ice/60 px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[14.5px] font-bold text-ink">
              Their onboarding link
            </p>
            <p className="mt-1 text-[13.5px] leading-relaxed text-ink/60">
              {row.intake_completed_at ? (
                <>
                  Completed {pretty(row.intake_completed_at.slice(0, 10))}
                  {row.plan_signed_name ? ` · signed ${row.plan_signed_name}` : ""}
                </>
              ) : row.intake_sent_at && !intakeExpired ? (
                <>
                  Sent {pretty(row.intake_sent_at.slice(0, 10))} · expires{" "}
                  {pretty(row.intake_expires_at!.slice(0, 10))} · not opened yet
                </>
              ) : row.intake_sent_at ? (
                <>Expired {pretty(row.intake_expires_at!.slice(0, 10))}</>
              ) : (
                <>
                  Not sent. It is where they give you their PTIN, sign the
                  security plan, and upload their W-9 and ID.
                </>
              )}
            </p>
          </div>

          <button
            type="button"
            disabled={busy !== null}
            onClick={async () => {
              const reply = await onSend(
                { action: "send-intake", id: row.id },
                `intake-${row.id}`
              );
              if (reply?.url) {
                setLink(reply.url);
                setLinkWarning(
                  reply.emailed === false
                    ? "The email did not go out, but the link is live — send it to them yourself."
                    : null
                );
              }
            }}
            className="btn-outline shrink-0 px-5 py-2.5 text-[14px]"
          >
            {busy === `intake-${row.id}`
              ? "Sending…"
              : row.intake_completed_at
              ? "Send again"
              : row.intake_sent_at
              ? "Send a new link"
              : "Send intake link"}
          </button>
        </div>

        {!planUrl && !row.intake_completed_at && (
          <p className="mt-3 rounded-lg bg-[#faf2d6] px-4 py-3 text-[13.5px] leading-relaxed text-ink/80">
            No security plan link is set yet. Set one at the bottom of this page
            first, or they will be asked to sign a plan nobody has given them.
          </p>
        )}

        {link && (
          <div className="mt-4 rounded-lg border border-gold-500/50 bg-white p-4">
            <p className="text-[13px] font-bold uppercase tracking-[0.14em] text-ink/55">
              Copy it now — this is the only time it is shown
            </p>
            <input
              readOnly
              value={link}
              onFocus={(e) => e.currentTarget.select()}
              className="mt-2 w-full rounded-lg border border-ink/15 bg-ice px-3 py-2 font-mono text-[12.5px] text-ink"
            />
            <p className="mt-2 text-[13px] leading-relaxed text-ink/55">
              {linkWarning ??
                "Also emailed to them. Works once, expires in three weeks, and sending a new link retires this one."}
            </p>
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

/* ------------------------------------------------------- the plan link ---- */

function PlanLink({
  current,
  busy,
  onSend,
}: {
  current: string | null;
  busy: string | null;
  onSend: Send;
}) {
  const [url, setUrl] = useState(current ?? "");
  const changed = url.trim() !== (current ?? "");

  return (
    <div className="mt-5 rounded-2xl border border-ink/10 bg-white p-6">
      <label
        htmlFor="plan-url"
        className="block text-[11.5px] font-bold uppercase tracking-[0.16em] text-ink/55"
      >
        Link to the plan
      </label>
      <input
        id="plan-url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://…"
        inputMode="url"
        spellCheck={false}
        className="mt-2 w-full rounded-lg border border-ink/15 bg-white px-4 py-3 text-[15px] text-ink outline-none transition focus:border-gold-500"
      />
      <div className="mt-4 flex flex-wrap items-center gap-4">
        {changed && (
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => onSend({ action: "set-plan-url", url }, "plan-url")}
            className="btn-gold px-6 py-2.5 text-[14.5px]"
          >
            {busy === "plan-url" ? "Saving…" : "Save link"}
          </button>
        )}
        {current && (
          <a
            href={current}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[14.5px] font-semibold text-ink underline underline-offset-4 hover:text-gold-700"
          >
            Open it and check the sharing works
          </a>
        )}
      </div>
      <p className="mt-4 max-w-[58ch] text-[13.5px] leading-relaxed text-ink/55">
        Open it in a private window before you send anyone a link. A share
        setting that works for you and nobody else is the usual reason a
        preparer stalls here.
      </p>
    </div>
  );
}

/* ------------------------------------------------------- documents ------- */

const KIND_LABEL: Record<OnboardingFile["kind"], string> = {
  w9: "W-9",
  id: "Photo ID",
  other: "Other",
};

function sizeOf(n: number) {
  return n < 1024 * 1024
    ? `${Math.max(1, Math.round(n / 1024))} KB`
    : `${(n / 1024 / 1024).toFixed(1)} MB`;
}

/** Age in whole days, which is the number that matters here: a W-9 nobody has
 *  cleared out is a liability that grows with exactly this figure. */
function ageInDays(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

function Documents({
  row,
  files,
  busy,
  onSend,
}: {
  row: OnboardingRow;
  files: OnboardingFile[];
  busy: string | null;
  onSend: Send;
}) {
  // Optimistic: a deleted file disappears immediately rather than waiting for
  // the server round-trip and the refresh behind it.
  const [removed, setRemoved] = useState<string[]>([]);
  const [confirming, setConfirming] = useState<string | null>(null);
  const live = files.filter((f) => !removed.includes(f.id));

  async function open(fileId: string) {
    const reply = await onSend(
      { action: "file-url", fileId },
      `open-${fileId}`
    );
    if (!reply?.url) return;
    // A signed URL good for sixty seconds. Opened in a new tab rather than
    // navigated to, so her place on this page is not lost.
    window.open(reply.url, "_blank", "noopener,noreferrer");
  }

  if (live.length === 0) {
    return (
      <p className="mt-5 rounded-xl border border-dashed border-ink/15 px-5 py-4 text-[13.5px] leading-relaxed text-ink/50">
        No documents uploaded yet. They arrive here when{" "}
        {row.first_name} sends them from their onboarding link.
      </p>
    );
  }

  return (
    <div className="mt-5 rounded-xl border border-ink/12 bg-white px-5 py-4">
      <p className="text-[11.5px] font-bold uppercase tracking-[0.16em] text-ink/55">
        Documents on file
      </p>

      <ul className="mt-3 divide-y divide-ink/8">
        {live.map((f) => {
          const days = ageInDays(f.uploaded_at);
          const stale = days >= 30;
          return (
            <li
              key={f.id}
              className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3"
            >
              <div className="min-w-0">
                <p className="text-[14.5px] font-semibold text-ink">
                  {KIND_LABEL[f.kind]}
                  {f.label ? ` · ${f.label}` : ""}
                </p>
                <p className="mt-0.5 break-all text-[13px] text-ink/55">
                  {f.file_name} · {sizeOf(f.size_bytes)} ·{" "}
                  <span className={stale ? "font-semibold text-[#a8341c]" : ""}>
                    {days === 0
                      ? "today"
                      : days === 1
                        ? "1 day old"
                        : `${days} days old`}
                  </span>
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={() => open(f.id)}
                  className="btn-outline px-4 py-2 text-[13.5px]"
                >
                  {busy === `open-${f.id}` ? "Opening…" : "Open"}
                </button>

                {confirming === f.id ? (
                  <>
                    <button
                      type="button"
                      disabled={busy !== null}
                      onClick={async () => {
                        const ok = await onSend(
                          { action: "file-delete", fileId: f.id },
                          `del-${f.id}`
                        );
                        if (ok) setRemoved((p) => [...p, f.id]);
                        setConfirming(null);
                      }}
                      className="rounded-lg bg-[#a8341c] px-4 py-2 text-[13.5px] font-semibold text-white"
                    >
                      {busy === `del-${f.id}` ? "Deleting…" : "Delete for good"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirming(null)}
                      className="px-2 py-2 text-[13.5px] text-ink/55 underline underline-offset-4"
                    >
                      Keep
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() => setConfirming(f.id)}
                    className="px-3 py-2 text-[13.5px] text-ink/55 underline underline-offset-4 hover:text-[#a8341c]"
                  >
                    Delete
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <p className="mt-3 text-[12.5px] leading-relaxed text-ink/45">
        Deleting destroys the file. The record that it was here, and that you
        deleted it, is kept.
      </p>
    </div>
  );
}
