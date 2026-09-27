"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Sign-in, on one screen, in up to three states.
 *
 *   email   → ask for a code
 *   code    → enter the six digits
 *   ask     → the address is not on the roster; offer to request access
 *
 * Kept on one screen on purpose. Somebody who has just typed their email is
 * two feet from the code that arrives; sending them to a second URL loses
 * people and gains nothing. The address stays visible throughout, so when the
 * code does not turn up they can see the typo for themselves.
 *
 * The `ask` state exists because the alternative is a dead end. Being told
 * "you're not on the roster" and nothing else is only marginally better than
 * silence — it tells a genuine applicant that something is wrong without
 * giving them any way to fix it.
 */

const PHONE = "313-771-4400";

type Step = "email" | "code" | "ask";

export default function SignInForm() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note_, setNotice] = useState<string | null>(null);
  const [asked, setAsked] = useState(false);
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
      notEnrolled?: boolean;
      alreadyAsked?: boolean;
    };
    return { ok: res.ok && data.ok !== false, data };
  }

  async function sendCode(e?: React.FormEvent) {
    e?.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);

    const { ok, data } = await post("/api/academy/request-code", { email });
    setBusy(false);

    if (!ok) {
      if (data.notEnrolled) {
        setStep("ask");
        setError(null);
        return;
      }
      setError(data.error ?? "Something went wrong. Try again in a moment.");
      return;
    }

    setStep("code");
    setNotice("A six-digit code is on its way. It expires in fifteen minutes.");
    setTimeout(() => codeRef.current?.focus(), 50);
  }

  async function submitCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const { ok, data } = await post("/api/academy/verify-code", { email, code });

    if (!ok) {
      setBusy(false);
      setCode("");
      setError(data.error ?? "That code doesn't match.");
      codeRef.current?.focus();
      return;
    }

    // The session cookie is set. Let the server decide what they see next —
    // an instructor lands on the same course page with an extra link on it.
    router.replace("/academy");
    router.refresh();
  }

  async function askToJoin(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const { ok, data } = await post("/api/academy/request-access", {
      email,
      name,
      note,
    });
    setBusy(false);

    if (!ok) {
      setError(data.error ?? "We couldn't record that. Please call the office.");
      return;
    }
    setAsked(true);
  }

  const labelClass =
    "block text-[11.5px] font-bold uppercase tracking-[0.16em] text-ink/55";
  const inputClass =
    "mt-2 w-full rounded-lg border border-ink/15 bg-white px-4 py-3.5 text-[16px] text-ink outline-none transition focus:border-gold-500";

  /* ------------------------------------------------- request submitted --- */
  if (step === "ask" && asked) {
    return (
      <div className="card">
        <h2 className="text-[19px] font-bold">Request sent</h2>
        <p className="mt-3 text-[15.5px] leading-relaxed text-ink/75">
          We have your details and someone will look at them. If you are meant
          to be on the course you will get an email once you have been added —
          there is nothing else for you to do.
        </p>
        <p className="mt-4 text-[15px] leading-relaxed text-ink/65">
          If it is urgent, call{" "}
          <a href="tel:+13137714400" className="font-semibold underline">
            {PHONE}
          </a>
          .
        </p>
        <button
          type="button"
          onClick={() => {
            setStep("email");
            setAsked(false);
            setName("");
            setNote("");
            setError(null);
          }}
          className="mt-6 text-[14px] text-ink/55 underline underline-offset-2 hover:text-ink"
        >
          Try a different email address
        </button>
      </div>
    );
  }

  return (
    <div className="card">
      {/* --------------------------------------------------------- email -- */}
      {step === "email" && (
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
            {busy ? "Checking…" : "Email me a code"}
          </button>
        </form>
      )}

      {/* ---------------------------------------------------------- code -- */}
      {step === "code" && (
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
                setNotice(null);
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

      {/* ----------------------------------------------------------- ask -- */}
      {step === "ask" && (
        <form onSubmit={askToJoin} noValidate>
          <h2 className="text-[19px] font-bold">You&rsquo;re not on the roster</h2>
          <p className="mt-3 text-[15.5px] leading-relaxed text-ink/75">
            <span className="font-semibold text-ink">{email}</span> isn&rsquo;t
            enrolled, so no code has been sent and none is coming.
          </p>
          <p className="mt-3 text-[15px] leading-relaxed text-ink/65">
            If you typed it wrong,{" "}
            <button
              type="button"
              onClick={() => {
                setStep("email");
                setError(null);
              }}
              className="font-semibold underline underline-offset-2 hover:text-ink"
            >
              try again
            </button>
            . If you should be on the course, ask us to add you.
          </p>

          <div className="mt-6">
            <label htmlFor="academy-name" className={labelClass}>
              Your name
            </label>
            <input
              id="academy-name"
              type="text"
              autoComplete="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="First and last"
              className={inputClass}
            />
          </div>

          <div className="mt-4">
            <label htmlFor="academy-note" className={labelClass}>
              Anything that helps us place you{" "}
              <span className="font-normal normal-case tracking-normal text-ink/45">
                (optional)
              </span>
            </label>
            <textarea
              id="academy-note"
              rows={3}
              maxLength={600}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. I applied through the Facebook ad on 20 September"
              className={`${inputClass} resize-y leading-relaxed`}
            />
          </div>

          <button
            type="submit"
            disabled={busy || name.trim().length < 2}
            className="btn-gold mt-5 w-full"
          >
            {busy ? "Sending…" : "Ask to be added"}
          </button>
          <p className="mt-4 text-[14px] leading-relaxed text-ink/55">
            Or call{" "}
            <a href="tel:+13137714400" className="font-semibold underline">
              {PHONE}
            </a>{" "}
            — often faster.
          </p>
        </form>
      )}

      {note_ && !error && (
        <p className="mt-5 rounded-lg bg-ice px-4 py-3 text-[14.5px] leading-relaxed text-ink/75">
          {note_}
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
