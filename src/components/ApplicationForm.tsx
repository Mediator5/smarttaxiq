"use client";

import { useState } from "react";
import { getAttribution, trackConversion } from "@/lib/analytics";

/**
 * Preparer application form.
 *
 * The three questions that decide whether this is worth a phone call —
 * availability for training, availability for the season, and whether 1099
 * contract work is what they want — are asked first and asked plainly. An
 * applicant who answers no to any of them has saved everyone a call, and
 * saying so up front is fairer than discovering it fifteen minutes in.
 */

type State = "idle" | "sending" | "sent" | "error";

const field =
  "w-full rounded-lg border border-ink/15 bg-white px-4 py-3 text-[15px] text-ink placeholder:text-ink/35 transition focus:border-gold-500 focus:outline-none focus:ring-2 focus:ring-gold-500/25";
const label = "block text-[13px] font-semibold text-ink/70";

function Radio({
  name,
  value,
  children,
  defaultChecked = false,
}: {
  name: string;
  value: string;
  children: React.ReactNode;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-ink/12 px-3.5 py-2.5 text-[14.5px] leading-snug transition hover:border-gold-400 has-[:checked]:border-gold-500 has-[:checked]:bg-gold-50">
      <input
        type="radio"
        name={name}
        value={value}
        defaultChecked={defaultChecked}
        required
        className="mt-[3px] accent-gold-500"
      />
      <span>{children}</span>
    </label>
  );
}

export default function ApplicationForm() {
  const [state, setState] = useState<State>("idle");
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState("sending");
    setError("");

    const payload = {
      ...Object.fromEntries(new FormData(e.currentTarget).entries()),
      attribution: getAttribution(),
    };

    try {
      const res = await fetch("/api/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) {
        setError(json.error ?? "Something went wrong. Please try again.");
        setState("error");
        return;
      }
      trackConversion("lead_contact", { source: "careers-application" });
      setState("sent");
    } catch {
      setError(
        "We couldn't send that. Please call 313-771-4400 instead — we'd rather not lose your application."
      );
      setState("error");
    }
  }

  if (state === "sent") {
    return (
      <div className="rounded-2xl border border-mint-200 bg-mint-50 p-8">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-mint-500">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M20 6L9 17l-5-5"
              stroke="#fff"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <h3 className="mt-5 font-display text-[22px] font-extrabold text-ink">
          Application received
        </h3>
        <p className="mt-3 text-[15.5px] leading-[1.7] text-ink/70">
          We read every one. If it looks like a fit, someone will call you
          within one business day — it&rsquo;ll be a Detroit number, so keep an
          eye out for it.
        </p>
        <p className="mt-3 text-[15.5px] leading-[1.7] text-ink/70">
          Check your inbox too — we&rsquo;ve sent you a confirmation with the
          dates.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-7">
      <fieldset className="space-y-3">
        <legend className={label}>Which role?</legend>
        <div className="grid gap-2.5 sm:grid-cols-3">
          <Radio name="role" value="remote">Remote</Radio>
          <Radio name="role" value="office">Detroit office</Radio>
          <Radio name="role" value="either">Either</Radio>
        </div>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className={label}>
          Can you complete 10 weeks of training starting October 1, 2026?
        </legend>
        <div className="grid gap-2.5 sm:grid-cols-2">
          <Radio name="training" value="yes">Yes</Radio>
          <Radio name="training" value="no">No</Radio>
        </div>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className={label}>
          Are you available to work January through April 2027?
        </legend>
        <div className="grid gap-2.5 sm:grid-cols-2">
          <Radio name="season" value="yes">Yes</Radio>
          <Radio name="season" value="no">No</Radio>
        </div>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className={label}>
          This is 1099 contract work, paid per return. Is that what you&rsquo;re
          looking for?
        </legend>
        <div className="grid gap-2.5 sm:grid-cols-2">
          <Radio name="contractor" value="yes">Yes</Radio>
          <Radio name="contractor" value="no">No</Radio>
        </div>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className={label}>
          Have you prepared tax returns for other people before?
        </legend>
        <div className="grid gap-2.5 sm:grid-cols-3">
          <Radio name="experience" value="none">Never</Radio>
          <Radio name="experience" value="some">1–2 seasons</Radio>
          <Radio name="experience" value="lots">3+ seasons</Radio>
        </div>
        <p className="text-[13.5px] text-ink/50">
          &ldquo;Never&rdquo; is a completely fine answer — that&rsquo;s what
          the training is for.
        </p>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className={label}>Do you currently have a PTIN?</legend>
        <div className="grid gap-2.5 sm:grid-cols-3">
          <Radio name="ptin" value="yes">Yes</Radio>
          <Radio name="ptin" value="no">No</Radio>
          <Radio name="ptin" value="unsure">Not sure</Radio>
        </div>
        <p className="text-[13.5px] text-ink/50">
          Most people don&rsquo;t. We&rsquo;ll walk you through getting one in
          week one.
        </p>
      </fieldset>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className={label} htmlFor="ap-name">Your name</label>
          <input id="ap-name" name="name" required autoComplete="name"
                 className={`mt-2 ${field}`} placeholder="First and last" />
        </div>
        <div>
          <label className={label} htmlFor="ap-phone">Phone</label>
          <input id="ap-phone" name="phone" type="tel" required autoComplete="tel"
                 className={`mt-2 ${field}`} placeholder="(313) 555-0100" />
        </div>
      </div>

      <div>
        <label className={label} htmlFor="ap-email">Email</label>
        <input id="ap-email" name="email" type="email" required autoComplete="email"
               className={`mt-2 ${field}`} placeholder="you@example.com" />
      </div>

      <div>
        <label className={label} htmlFor="ap-note">
          Anything you want us to know? <span className="font-normal text-ink/45">Optional</span>
        </label>
        <textarea id="ap-note" name="note" rows={4} className={`mt-2 ${field}`}
                  placeholder="Why this caught your eye, any experience you have, anything we should know about your availability." />
      </div>

      {/* Honeypot — hidden from people, catches bots. */}
      <div className="absolute left-[-9999px]" aria-hidden>
        <label htmlFor="ap-company">Company</label>
        <input id="ap-company" name="company" tabIndex={-1} autoComplete="off" />
      </div>

      <div>
        <button type="submit" disabled={state === "sending"}
                className="btn-gold w-full disabled:opacity-60 sm:w-auto">
          {state === "sending" ? "Sending…" : "Send my application"}
        </button>
        <p className="mt-3 text-[13px] leading-relaxed text-ink/45">
          We&rsquo;ll only use these details to consider your application and
          get in touch about it. See our{" "}
          <a href="/privacy" className="underline underline-offset-2 hover:text-ink/70">
            privacy policy
          </a>
          .
        </p>
      </div>

      {state === "error" && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-[14.5px] text-red-700">
          {error}
        </p>
      )}
    </form>
  );
}
