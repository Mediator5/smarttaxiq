"use client";

import { useState } from "react";

const topics = [
  { value: "new-return", label: "I want to file a return" },
  { value: "existing-client", label: "I'm an existing client" },
  { value: "notice", label: "I got an IRS notice" },
  { value: "business", label: "Business or entity return" },
  { value: "other", label: "Something else" },
];

type State = "idle" | "sending" | "sent" | "error";

const field =
  "w-full rounded-lg border border-ink/15 bg-white px-4 py-3 text-[15px] text-ink placeholder:text-ink/35 transition focus:border-gold-500 focus:outline-none focus:ring-2 focus:ring-gold-500/25";

const label = "block text-[13px] font-semibold text-ink/70";

export default function ContactForm() {
  const [state, setState] = useState<State>("idle");
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState("sending");
    setError("");

    const data = Object.fromEntries(new FormData(e.currentTarget).entries());

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();

      if (!res.ok || !json.ok) {
        setError(json.error ?? "Something went wrong. Please try again.");
        setState("error");
        return;
      }

      setState("sent");
    } catch {
      setError(
        "We couldn't send that. Please call us instead — we'd rather not lose your message."
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
        <h2 className="mt-5 text-[21px]">Message received</h2>
        <p className="mt-3 text-[15.5px] leading-[1.7] text-ink/70">
          We&rsquo;ll come back to you within one business day. If it&rsquo;s
          urgent — a notice with a deadline on it, for instance — call rather
          than wait.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-5" noValidate>
      {/* Honeypot */}
      <div className="hidden" aria-hidden>
        <label htmlFor="company">Company</label>
        <input id="company" name="company" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className={label}>
            Your name
          </label>
          <input
            id="name"
            name="name"
            required
            autoComplete="name"
            className={`${field} mt-2`}
            placeholder="Jordan Ellis"
          />
        </div>
        <div>
          <label htmlFor="email" className={label}>
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className={`${field} mt-2`}
            placeholder="you@example.com"
          />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="phone" className={label}>
            Phone <span className="font-normal text-ink/40">(optional)</span>
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            className={`${field} mt-2`}
            placeholder="313-555-0142"
          />
        </div>
        <div>
          <label htmlFor="topic" className={label}>
            What&rsquo;s this about?
          </label>
          <select
            id="topic"
            name="topic"
            defaultValue="new-return"
            className={`${field} mt-2`}
          >
            {topics.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="message" className={label}>
          How can we help?
        </label>
        <textarea
          id="message"
          name="message"
          required
          rows={6}
          className={`${field} mt-2 resize-y`}
          placeholder="A sentence or two about your situation is plenty."
        />
      </div>

      {state === "error" && (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[14px] text-red-800"
        >
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={state === "sending"}
          className="btn-gold"
        >
          {state === "sending" ? "Sending…" : "Send message"}
        </button>
        <p className="text-[13px] text-ink/45">
          Please don&rsquo;t include Social Security numbers here.
        </p>
      </div>
    </form>
  );
}
