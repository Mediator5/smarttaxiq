"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Two steps on one screen: ask for a code, then enter it.
 *
 * Kept on one screen on purpose. A student who has just typed their email is
 * two feet from the code that arrives; sending them to a second URL loses
 * people and gains nothing. The address stays visible throughout, so when the
 * code does not turn up they can see the typo for themselves.
 */
export default function SignInForm() {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const codeRef = useRef<HTMLInputElement>(null);

  async function post(url: string, payload: unknown) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      error?: string;
    };
    return { ok: res.ok && data.ok !== false, error: data.error };
  }

  async function sendCode(e?: React.FormEvent) {
    e?.preventDefault();
    setBusy(true);
    setError(null);
    setNote(null);

    const result = await post("/api/academy/request-code", { email });
    setBusy(false);

    if (!result.ok) {
      setError(result.error ?? "Something went wrong. Try again in a moment.");
      return;
    }

    setStep("code");
    setNote(
      "If that address is on the roster, a six-digit code is on its way. It expires in fifteen minutes."
    );
    setTimeout(() => codeRef.current?.focus(), 50);
  }

  async function submitCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const result = await post("/api/academy/verify-code", { email, code });

    if (!result.ok) {
      setBusy(false);
      setCode("");
      setError(result.error ?? "That code doesn't match.");
      codeRef.current?.focus();
      return;
    }

    // The session cookie is set. Let the server decide what they see next —
    // an instructor lands on the same course page with an extra link on it.
    router.replace("/academy");
    router.refresh();
  }

  const labelClass =
    "block text-[11.5px] font-bold uppercase tracking-[0.16em] text-ink/55";
  const inputClass =
    "mt-2 w-full rounded-lg border border-ink/15 bg-white px-4 py-3.5 text-[16px] text-ink outline-none transition focus:border-gold-500";

  return (
    <div className="card">
      {step === "email" ? (
        <form onSubmit={sendCode} noValidate>
          <label htmlFor="academy-email" className={labelClass}>
            Your email address
          </label>
          <input
            id="academy-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoFocus
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="the address you enrolled with"
            className={inputClass}
          />
          <p className="mt-3 text-[14.5px] leading-relaxed text-ink/65">
            There is no password to remember. We email you a code that works
            once.
          </p>
          <button
            type="submit"
            disabled={busy || !email}
            className="btn-gold mt-5 w-full"
          >
            {busy ? "Sending…" : "Email me a code"}
          </button>
        </form>
      ) : (
        <form onSubmit={submitCode} noValidate>
          <label htmlFor="academy-code" className={labelClass}>
            The six-digit code
          </label>
          <input
            id="academy-code"
            ref={codeRef}
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]*"
            maxLength={6}
            required
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            placeholder="000000"
            className={`${inputClass} text-center text-[26px] tracking-[0.3em]`}
          />
          <p className="mt-3 text-[14.5px] leading-relaxed text-ink/65">
            Sent to <span className="font-semibold text-ink">{email}</span>.{" "}
            <button
              type="button"
              onClick={() => {
                setStep("email");
                setCode("");
                setError(null);
                setNote(null);
              }}
              className="underline underline-offset-2 hover:text-ink"
            >
              Wrong address?
            </button>
          </p>
          <button
            type="submit"
            disabled={busy || code.length !== 6}
            className="btn-gold mt-5 w-full"
          >
            {busy ? "Checking…" : "Sign in"}
          </button>
          <button
            type="button"
            onClick={() => sendCode()}
            disabled={busy}
            className="mt-3 w-full text-[14px] text-ink/55 underline underline-offset-2 hover:text-ink"
          >
            Send another code
          </button>
        </form>
      )}

      {note && !error && (
        <p className="mt-5 rounded-lg bg-ice px-4 py-3 text-[14.5px] leading-relaxed text-ink/75">
          {note}
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="mt-5 rounded-lg bg-[#fbeeea] px-4 py-3 text-[14.5px] leading-relaxed text-[#a8341c]"
        >
          {error}
        </p>
      )}
    </div>
  );
}
