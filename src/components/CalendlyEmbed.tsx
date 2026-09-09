"use client";

import { useEffect, useRef, useState } from "react";
import { getAttribution, trackConversion } from "@/lib/analytics";

declare global {
  interface Window {
    Calendly?: {
      initInlineWidget: (opts: {
        url: string;
        parentElement: HTMLElement;
      }) => void;
    };
  }
}

const WIDGET_SRC = "https://assets.calendly.com/assets/external/widget.js";

/**
 * Calendly scheduler.
 *
 * Booking has to be possible in the moment someone decides they want it.
 * "Call us and we'll find a time" loses the visitor browsing at 10pm — which,
 * for a practice open Monday to Thursday in office hours, is a large share of
 * them.
 *
 * This is Calendly's standard inline embed, with three things added:
 *
 *   1. Campaign passthrough. The UTM parameters a visitor arrived on are
 *      replayed into the booking URL, so a booking that came from a paid click
 *      still names the campaign that paid for it. Without this, bookings are
 *      the one conversion advertising can never be credited for.
 *   2. A real conversion event, fired when a booking actually completes rather
 *      than when the widget opens.
 *   3. Correct behaviour on client-side navigation — see below.
 *
 * Availability (Mon–Thu 9:30–5:00 ET) is set inside Calendly, not here. The
 * event's schedule belongs with the calendar that has to honour it.
 */
export default function CalendlyEmbed({
  url,
  className = "",
  minHeight = 700,
}: {
  url: string;
  className?: string;
  minHeight?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const parent = ref.current;
    if (!url || !parent) return;

    // Carry the campaign into the booking so it survives into the webhook.
    const target = new URL(url);
    target.searchParams.set("hide_gdpr_banner", "1");
    const attribution = getAttribution() ?? {};
    for (const [key, value] of Object.entries(attribution)) {
      if (key.startsWith("utm_")) target.searchParams.set(key, value);
    }
    const finalUrl = target.toString();
    parent.setAttribute("data-url", finalUrl);

    /**
     * Calendly's script scans the page for `.calendly-inline-widget` once, when
     * it loads. On a normal page load that is exactly right.
     *
     * But this is an App Router site: navigating from the home page to /book
     * does not reload the document, so the script is already present and its
     * scan has long since run. Simply appending the tag again does nothing —
     * the browser will not re-execute a script it already has — and the
     * visitor gets an empty 700px box where the calendar should be. Anyone
     * arriving directly on /book would see it working, which is exactly the
     * kind of bug that survives testing.
     *
     * So: initialise directly when the script is already loaded, and only
     * inject the tag on the first mount of a session.
     */
    if (window.Calendly) {
      parent.innerHTML = "";
      window.Calendly.initInlineWidget({ url: finalUrl, parentElement: parent });
      return;
    }

    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${WIDGET_SRC}"]`
    );
    if (existing) {
      // Loaded but not ready yet — wait for it rather than racing it.
      const onLoad = () => {
        parent.innerHTML = "";
        window.Calendly?.initInlineWidget({
          url: finalUrl,
          parentElement: parent,
        });
      };
      existing.addEventListener("load", onLoad, { once: true });
      return () => existing.removeEventListener("load", onLoad);
    }

    const script = document.createElement("script");
    script.src = WIDGET_SRC;
    script.async = true;
    // A third party that fails to load must degrade to something useful, not
    // to an empty rectangle where the booking form should be.
    script.onerror = () => setFailed(true);
    document.body.appendChild(script);
  }, [url]);

  // Calendly posts a message when a booking completes. That — not opening the
  // widget — is the moment worth counting.
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (
        typeof e.data === "object" &&
        e.data?.event === "calendly.event_scheduled"
      ) {
        trackConversion("booking_started", { source: "calendly" });
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  if (!url || failed) return null;

  return (
    <div className={className}>
      <div
        ref={ref}
        className="calendly-inline-widget overflow-hidden rounded-2xl border border-ink/10 bg-white"
        style={{ minWidth: 320, height: minHeight }}
        data-url={url}
      />
      <p className="mt-4 text-center text-[13.5px] text-ink/50">
        Trouble with the calendar?{" "}
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-gold-700 underline underline-offset-2"
        >
          Open it in a new tab
        </a>
        .
      </p>
    </div>
  );
}
