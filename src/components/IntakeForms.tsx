"use client";

import { useState } from "react";
import { site } from "@/lib/site";

type Which = "personal" | "business";

const TABS: { key: Which; label: string; blurb: string }[] = [
  {
    key: "personal",
    label: "Personal taxes",
    blurb:
      "W-2 income, 1099 and gig work, families, students, retirees, and anyone filing for themselves.",
  },
  {
    key: "business",
    label: "Business taxes",
    blurb:
      "LLCs, S-corps, partnerships and corporations filing an entity return.",
  },
];

/**
 * The two live JotForm intake forms behind a switcher.
 *
 * The iframe is always mounted and the loading panel sits over it, so a
 * missed `load` event can never leave someone staring at a spinner forever.
 */
export default function IntakeForms() {
  const [which, setWhich] = useState<Which>("personal");
  const [loaded, setLoaded] = useState<Record<Which, boolean>>({
    personal: false,
    business: false,
  });

  const active = TABS.find((t) => t.key === which)!;
  const url = site.jotform[which];

  return (
    <div>
      <div
        className="inline-flex rounded-xl border border-ink/12 bg-ice p-1"
        role="tablist"
        aria-label="Choose a form"
      >
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={which === tab.key}
            aria-controls={`panel-${tab.key}`}
            id={`tab-${tab.key}`}
            onClick={() => setWhich(tab.key)}
            className={`rounded-lg px-5 py-2.5 text-[14px] font-semibold transition ${
              which === tab.key
                ? "bg-white text-ink shadow-[0_2px_8px_-4px_rgba(8,24,64,0.4)]"
                : "text-ink/55 hover:text-ink"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <p className="mt-5 max-w-2xl text-[15.5px] leading-[1.7] text-ink/65">
        {active.blurb}
      </p>

      <div
        id={`panel-${which}`}
        role="tabpanel"
        aria-labelledby={`tab-${which}`}
        className="relative mt-7 overflow-hidden rounded-2xl border border-ink/12 bg-white shadow-card"
      >
        <iframe
          key={which}
          src={url}
          title={`${active.label} intake form`}
          onLoad={() => setLoaded((s) => ({ ...s, [which]: true }))}
          className="h-[1150px] w-full border-0"
          scrolling="auto"
        />

        {!loaded[which] && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-white">
            <span
              aria-hidden
              className="h-8 w-8 animate-spin rounded-full border-2 border-ink/15 border-t-gold-500"
            />
            <p className="text-[14.5px] text-ink/55">Loading your form…</p>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[13.5px] font-semibold text-ink underline underline-offset-4"
            >
              Or open it in a new tab
            </a>
          </div>
        )}
      </div>

      <p className="mt-5 text-[13.5px] text-ink/50">
        Trouble with the form?{" "}
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-ink underline underline-offset-4"
        >
          Open it in a new tab
        </a>{" "}
        or call{" "}
        <a
          href={site.phoneHref}
          className="font-semibold text-ink underline underline-offset-4"
        >
          {site.phone}
        </a>
        .
      </p>
    </div>
  );
}
