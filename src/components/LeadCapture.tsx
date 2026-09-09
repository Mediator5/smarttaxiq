"use client";

import { useState } from "react";
import { getAttribution, trackConversion } from "@/lib/analytics";

/**
 * Email capture, on every major page.
 *
 * The offer here is deadline reminders and tax tips, not a download — this is
 * a site people visit in February and forget until the following February,
 * and the list is what closes that gap. It asks for an email and nothing else:
 * every extra field on a form this incidental costs more signups than the data
 * is worth.
 *
 *   band   — full-width section for the foot of a page
 *   card   — bordered block for a sidebar or between sections
 *   inline — compact row for tight spaces
 */

type Variant = "band" | "card" | "inline";

export default function LeadCapture({
  source,
  variant = "band",
  heading = "Never miss a tax deadline again",
  blurb = "Quarterly dates, filing reminders and the deductions people miss — sent when they matter, not all year round. Free.",
  cta = "Send me the updates",
  className = "",
}: {
  source: string;
  variant?: Variant;
  heading?: string;
  blurb?: string;
  cta?: string;
  className?: string;
}) {
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">(
    "idle"
  );
  const [message, setMessage] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setState("sending");

    const payload = {
      ...Object.fromEntries(new FormData(form).entries()),
      source,
      page:
        typeof window !== "undefined" ? window.location.pathname : undefined,
      attribution: getAttribution(),
    };

    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) throw new Error(json.error || "Request failed");

      trackConversion("lead_newsletter", { source });
      form.reset();
      setState("done");
    } catch (err) {
      setMessage(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
      setState("error");
    }
  }

  if (state === "done") {
    return (
      <div
        className={`rounded-2xl border border-mint/30 bg-mint/[0.06] p-7 text-center ${className}`}
      >
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-mint text-white">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M5 12.5l4.5 4.5L19 7.5"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <p className="mt-4 font-display text-[20px] font-extrabold text-ink">
          You&rsquo;re on the list
        </p>
        <p className="mt-2 text-[14.5px] leading-[1.7] text-ink/65">
          We&rsquo;ll send the next deadline before it catches you out.
        </p>
      </div>
    );
  }

  const field =
    "w-full rounded-lg border border-ink/15 bg-white px-4 py-3 text-[15px] text-ink placeholder:text-ink/40 focus:border-gold-500 focus:outline-none focus:ring-4 focus:ring-gold-500/15";

  const form = (
    <form
      onSubmit={onSubmit}
      className={variant === "band" ? "mx-auto max-w-md" : ""}
    >
      <div className="flex flex-col gap-3 sm:flex-row">
        <label htmlFor={`stiq-email-${source}`} className="sr-only">
          Email address
        </label>
        <input
          id={`stiq-email-${source}`}
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          className={field}
        />
        <button
          type="submit"
          disabled={state === "sending"}
          className="btn-gold shrink-0 disabled:opacity-60"
        >
          {state === "sending" ? "Sending…" : cta}
        </button>
      </div>

      {/* Honeypot — hidden from people, catches bots. */}
      <div className="absolute left-[-9999px]" aria-hidden>
        <label htmlFor={`stiq-website-${source}`}>Website</label>
        <input
          id={`stiq-website-${source}`}
          name="website"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      <p className="mt-3 text-[12.5px] leading-[1.6] text-ink/45">
        A few emails a year, around the dates that matter. Unsubscribe in one
        click.
      </p>

      {state === "error" && (
        <p className="mt-3 rounded-lg bg-red-50 px-4 py-3 text-[14px] text-red-700">
          {message}
        </p>
      )}
    </form>
  );

  if (variant === "inline") return <div className={className}>{form}</div>;

  if (variant === "card") {
    return (
      <div
        className={`rounded-2xl border border-ink/10 bg-ice p-7 sm:p-8 ${className}`}
      >
        <span className="eyebrow">Free</span>
        <h3 className="mt-3 font-display text-[23px] font-extrabold leading-tight text-ink">
          {heading}
        </h3>
        <p className="mt-3 text-[15px] leading-[1.7] text-ink/65">{blurb}</p>
        <div className="mt-6">{form}</div>
      </div>
    );
  }

  return (
    <section className={`bg-ice py-16 sm:py-20 ${className}`}>
      <div className="shell text-center">
        <span className="eyebrow">Free</span>
        <h2 className="mx-auto mt-4 max-w-2xl text-[28px] leading-[1.15] sm:text-[36px]">
          {heading}
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-[16px] leading-[1.7] text-ink/65">
          {blurb}
        </p>
        <div className="mt-8">{form}</div>
      </div>
    </section>
  );
}
