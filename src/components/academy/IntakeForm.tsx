"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * What the preparer actually fills in.
 *
 * Two fields and a tick. The PTIN, because only they know it, and a typed
 * name, because that is what turns "I read the security plan" from a checkbox
 * into something the practice can point at later. The IRS expects every person
 * who touches client data to have acknowledged the plan; a tick with nobody's
 * name on it is not an acknowledgement.
 *
 * The submit button is disabled until both the tick and a name are present,
 * and the name must plausibly be theirs — not to stop fraud, which a typed
 * signature was never going to do, but to stop somebody signing "yes" or "ok"
 * and producing a record that means nothing.
 */
export default function IntakeForm({
  token,
  firstName,
  fullName,
  email,
  ptin,
  planUrl,
}: {
  token: string;
  firstName: string;
  fullName: string;
  email: string;
  ptin: string | null;
  planUrl: string | null;
}) {
  const router = useRouter();
  const [value, setValue] = useState(ptin ?? "");
  const [read, setRead] = useState(false);
  const [signed, setSigned] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const labelClass =
    "block text-[11.5px] font-bold uppercase tracking-[0.16em] text-ink/55";
  const inputClass =
    "mt-2 w-full rounded-lg border border-ink/15 bg-white px-4 py-3 text-[16px] text-ink outline-none transition focus:border-gold-500";

  // Two words, each of a couple of letters. Low bar on purpose: it is here to
  // catch "yes", not to adjudicate anybody's name.
  const nameLooksReal = /^\s*\S{2,}(\s+\S{2,})+\s*$/.test(signed);
  const ready = read && nameLooksReal && !busy;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, ptin: value, signedName: signed }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };
      if (!res.ok || data.ok === false) {
        setError(data.error ?? "That didn't send. Try again in a moment.");
        return;
      }
      router.refresh();
    } catch {
      setError("Couldn't reach the server. Check your connection.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-10 space-y-8" noValidate>
      {/* ------------------------------------------------------- PTIN ---- */}
      <section className="rounded-2xl border border-ink/10 bg-white p-6">
        <h2 className="text-[19px] font-bold">1 · Your PTIN</h2>
        <p className="mt-2 max-w-[58ch] text-[15px] leading-relaxed text-ink/65">
          The preparer tax identification number the IRS issued you — the letter
          P followed by eight digits. It is on your PTIN renewal confirmation.
          It is a public credential, not a secret.
        </p>

        <div className="mt-5 max-w-[260px]">
          <label htmlFor="i-ptin" className={labelClass}>
            PTIN
          </label>
          <input
            id="i-ptin"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="P01234567"
            autoComplete="off"
            spellCheck={false}
            className={`${inputClass} font-mono`}
          />
        </div>

        <p className="mt-4 max-w-[58ch] text-[14px] leading-relaxed text-ink/55">
          Do not have one yet, or not sure it is current? Leave it blank, send
          the rest, and tell us — you cannot prepare a return without it, so it
          is better dealt with now than in January.
        </p>
      </section>

      {/* ------------------------------------------------ security plan -- */}
      <section className="rounded-2xl border border-ink/10 bg-white p-6">
        <h2 className="text-[19px] font-bold">2 · Our security plan</h2>
        <p className="mt-2 max-w-[58ch] text-[15px] leading-relaxed text-ink/65">
          Every practice that handles client tax data has to have a written
          information security plan, and everyone who touches that data has to
          have read it. This is that acknowledgement.
        </p>

        {planUrl ? (
          <p className="mt-5">
            <a
              href={planUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-outline inline-block px-6 py-3 text-[15px]"
            >
              Read the security plan
            </a>
          </p>
        ) : (
          <p className="mt-5 rounded-lg bg-ice px-4 py-3 text-[14.5px] leading-relaxed text-ink/70">
            The plan was sent to <strong>{email}</strong> separately. Read it
            before you sign below — if it has not arrived, do not sign; reply to
            the email this link came in and ask for it.
          </p>
        )}

        <label className="mt-6 flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={read}
            onChange={(e) => setRead(e.target.checked)}
            className="mt-1 h-[18px] w-[18px] shrink-0 accent-[#1f6f4a]"
          />
          <span className="max-w-[58ch] text-[15.5px] leading-relaxed text-ink">
            I have read the security plan and I will follow it, including how
            client data is stored, shared and disposed of.
          </span>
        </label>

        <div className="mt-6 max-w-[380px]">
          <label htmlFor="i-sign" className={labelClass}>
            Sign by typing your full name
          </label>
          <input
            id="i-sign"
            value={signed}
            onChange={(e) => setSigned(e.target.value)}
            placeholder={fullName || `${firstName} …`}
            autoComplete="name"
            className={inputClass}
          />
          <p className="mt-2 text-[13.5px] text-ink/50">
            Your name, today&rsquo;s date and the connection it was signed from
            are recorded.
          </p>
        </div>
      </section>

      {error && (
        <p
          role="alert"
          className="rounded-xl bg-[#fbeeea] px-5 py-4 text-[15px] text-[#a8341c]"
        >
          {error}
        </p>
      )}

      <div>
        <button type="submit" disabled={!ready} className="btn-gold">
          {busy ? "Sending…" : "Send this to Smart Tax IQ"}
        </button>
        {!ready && !busy && (
          <p className="mt-3 text-[14px] text-ink/50">
            Tick the box and type your full name to send.
          </p>
        )}
      </div>
    </form>
  );
}
