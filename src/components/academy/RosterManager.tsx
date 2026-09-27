"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AccessRequest } from "@/lib/academy/store";

/**
 * The instructor's roster controls.
 *
 * Every mutation goes to /api/academy/roster, which re-checks that the caller
 * is an instructor against the database — this component being hidden is
 * presentation, not security.
 *
 * After each write it calls router.refresh(), so the server component above
 * re-renders from Postgres rather than this component keeping a second copy
 * of the roster in React state that can drift.
 */

export type RosterRow = {
  id: string;
  email: string;
  first_name: string;
  last_name: string | null;
  role: "student" | "instructor";
  cohort: string;
  status: "active" | "withdrawn";
  last_seen_at: string | null;
};

export default function RosterManager({
  roster,
  requests,
  cohort,
  viewerId,
}: {
  roster: RosterRow[];
  requests: AccessRequest[];
  cohort: string;
  viewerId: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState<"student" | "instructor">("student");

  async function send(payload: Record<string, unknown>, key: string) {
    setBusy(key);
    setError(null);
    setDone(null);
    try {
      const res = await fetch("/api/academy/roster", {
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
    const ok = await send(
      { action: "add", email, firstName, lastName, role, cohort },
      "add"
    );
    if (ok) {
      setDone(`${firstName || email} is on the roster.`);
      setEmail("");
      setFirstName("");
      setLastName("");
      setRole("student");
    }
  }

  const labelClass =
    "block text-[11.5px] font-bold uppercase tracking-[0.16em] text-ink/55";
  const inputClass =
    "mt-2 w-full rounded-lg border border-ink/15 bg-white px-4 py-3 text-[15.5px] text-ink outline-none transition focus:border-gold-500";

  return (
    <div className="space-y-12">
      {/* ------------------------------------------------ pending asks -- */}
      {requests.length > 0 && (
        <section>
          <h2 className="text-[20px] font-bold">
            Waiting to be added
            <span className="ml-3 rounded-full bg-gold-100 px-3 py-1 align-middle text-[12.5px] font-bold text-gold-700">
              {requests.length}
            </span>
          </h2>
          <p className="mt-2 max-w-[62ch] text-[15px] leading-relaxed text-ink/65">
            People who reached the sign-in page, were told they aren&rsquo;t
            enrolled, and asked to be added. Approving puts them on the roster
            straight away — they prove the address is theirs the first time they
            sign in.
          </p>

          <ul className="mt-5 space-y-3">
            {requests.map((r) => (
              <li
                key={r.id}
                className="rounded-2xl border border-ink/10 bg-white p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-[16px] font-bold text-ink">{r.name}</p>
                    <p className="break-all text-[14px] text-ink/65">
                      {r.email}
                    </p>
                    {r.note && (
                      <p className="mt-3 max-w-[58ch] rounded-lg bg-ice px-4 py-3 text-[14.5px] leading-relaxed text-ink/75">
                        {r.note}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      disabled={busy !== null}
                      onClick={() => {
                        const [first, ...rest] = r.name.trim().split(/\s+/);
                        send(
                          {
                            action: "approve",
                            requestId: r.id,
                            email: r.email,
                            firstName: first,
                            lastName: rest.join(" "),
                            role: "student",
                            cohort,
                          },
                          r.id
                        );
                      }}
                      className="btn-gold px-5 py-2.5 text-[14px]"
                    >
                      {busy === r.id ? "…" : "Add to roster"}
                    </button>
                    <button
                      type="button"
                      disabled={busy !== null}
                      onClick={() =>
                        send({ action: "dismiss", requestId: r.id }, r.id)
                      }
                      className="btn-outline px-5 py-2.5 text-[14px]"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ----------------------------------------------------- add one -- */}
      <section>
        <h2 className="text-[20px] font-bold">Add someone</h2>
        <p className="mt-2 max-w-[62ch] text-[15px] leading-relaxed text-ink/65">
          They get no email from this. Send them the link yourself and they sign
          in with a code.
        </p>

        <form
          onSubmit={addPerson}
          className="mt-5 rounded-2xl border border-ink/10 bg-white p-6"
          noValidate
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="r-first" className={labelClass}>
                First name
              </label>
              <input
                id="r-first"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="r-last" className={labelClass}>
                Last name{" "}
                <span className="font-normal normal-case tracking-normal text-ink/45">
                  (optional)
                </span>
              </label>
              <input
                id="r-last"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div className="mt-4">
            <label htmlFor="r-email" className={labelClass}>
              Email address
            </label>
            <input
              id="r-email"
              type="email"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={inputClass}
            />
          </div>

          <fieldset className="mt-5">
            <legend className={labelClass}>They are a</legend>
            <div className="mt-3 flex flex-wrap gap-3">
              {(["student", "instructor"] as const).map((r) => (
                <label
                  key={r}
                  className={`cursor-pointer rounded-lg border px-4 py-2.5 text-[14.5px] transition ${
                    role === r
                      ? "border-gold-500 bg-gold-50 font-semibold text-ink"
                      : "border-ink/15 text-ink/70 hover:border-ink/40"
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value={r}
                    checked={role === r}
                    onChange={() => setRole(r)}
                    className="sr-only"
                  />
                  {r === "student" ? "Trainee" : "Instructor"}
                </label>
              ))}
            </div>
            {role === "instructor" && (
              <p className="mt-3 max-w-[58ch] rounded-lg bg-[#faf2d6] px-4 py-3 text-[14px] leading-relaxed text-ink/80">
                An instructor can see every student&rsquo;s scores and manage
                this roster. Only give it to someone who should have both.
              </p>
            )}
          </fieldset>

          <button
            type="submit"
            disabled={busy !== null || !email || !firstName}
            className="btn-gold mt-6"
          >
            {busy === "add" ? "Adding…" : "Add to roster"}
          </button>
          <p className="mt-3 text-[13.5px] text-ink/45">
            Cohort <span className="font-mono">{cohort}</span>
          </p>
        </form>
      </section>

      {/* ------------------------------------------------- the roster --- */}
      <section>
        <h2 className="text-[20px] font-bold">
          On the roster
          <span className="ml-3 text-[15px] font-normal text-ink/50">
            {roster.filter((r) => r.status === "active").length} active
          </span>
        </h2>

        <div className="mt-5 overflow-x-auto rounded-2xl border border-ink/10">
          <table className="w-full min-w-[620px] border-collapse text-[14.5px]">
            <thead>
              <tr className="bg-ice text-left">
                {["Name", "Email", "Role", "Cohort", "Status", ""].map((h) => (
                  <th
                    key={h}
                    scope="col"
                    className="px-4 py-3 text-[10.5px] font-bold uppercase tracking-[0.09em] text-ink/50"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {roster.map((p) => (
                <tr
                  key={p.id}
                  className={`border-t border-ink/10 ${
                    p.status === "withdrawn" ? "opacity-55" : ""
                  }`}
                >
                  <td className="px-4 py-3 font-semibold text-ink">
                    {p.first_name} {p.last_name ?? ""}
                    {p.id === viewerId && (
                      <span className="ml-2 text-[12px] font-normal text-ink/45">
                        you
                      </span>
                    )}
                  </td>
                  <td className="break-all px-4 py-3 text-ink/70">{p.email}</td>
                  <td className="px-4 py-3 text-ink/70">
                    {p.role === "instructor" ? "Instructor" : "Trainee"}
                  </td>
                  <td className="px-4 py-3 font-mono text-[13px] text-ink/60">
                    {p.cohort}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        p.status === "active"
                          ? "font-semibold text-mint-700"
                          : "font-semibold text-[#a8341c]"
                      }
                    >
                      {p.status === "active" ? "Active" : "Withdrawn"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {p.id !== viewerId && (
                      <button
                        type="button"
                        disabled={busy !== null}
                        onClick={() =>
                          send(
                            {
                              action:
                                p.status === "active"
                                  ? "withdraw"
                                  : "reactivate",
                              id: p.id,
                            },
                            p.id
                          )
                        }
                        className="text-[14px] text-ink/55 underline underline-offset-2 hover:text-ink"
                      >
                        {busy === p.id
                          ? "…"
                          : p.status === "active"
                          ? "Withdraw"
                          : "Reinstate"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-4 max-w-[62ch] text-[14px] leading-relaxed text-ink/55">
          Withdrawing never deletes anything. Their scores stay, they lose
          access on their next page load, and reinstating them brings
          everything back.
        </p>
      </section>

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
