"use client";

/**
 * Analytics, attribution and conversion tracking.
 *
 * Three jobs, all of which have to be in place *before* a penny is spent on
 * advertising, because none of them can be backfilled:
 *
 *   1. GA4 — where traffic comes from and what it does.
 *   2. Attribution — the campaign a visitor arrived on, stashed on landing
 *      and replayed into every form. Without it, a lead captured three pages
 *      deep is unattributable and ad spend cannot be judged honestly.
 *   3. Conversions — named events for the handful of actions that are worth
 *      money, so Google Ads can optimise towards them rather than towards
 *      clicks.
 *
 * Every tag is env-gated and absent until its ID is set, so nothing loads,
 * nothing is sent, and no consent banner is owed until you actually start.
 */

const ATTRIBUTION_KEY = "stiq_attribution";

const ATTRIBUTION_PARAMS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "gclid",
  "fbclid",
  "msclkid",
] as const;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
  }
}

/**
 * Read the campaign parameters off the current URL and remember them for the
 * rest of the session.
 *
 * First touch wins: someone who arrives from a Google ad, browses, then
 * returns via a bookmark should still be credited to the ad. Overwriting on
 * the second visit would quietly reassign every paid lead to "direct".
 */
export function captureAttribution() {
  if (typeof window === "undefined") return;
  try {
    const params = new URLSearchParams(window.location.search);
    const found: Record<string, string> = {};
    for (const key of ATTRIBUTION_PARAMS) {
      const value = params.get(key);
      if (value) found[key] = value.slice(0, 200);
    }
    if (!Object.keys(found).length) return;
    if (sessionStorage.getItem(ATTRIBUTION_KEY)) return;

    found.landing_page = window.location.pathname;
    if (document.referrer) found.referrer = document.referrer.slice(0, 200);
    sessionStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(found));
  } catch {
    // Private browsing, or storage disabled. Attribution is a nice-to-have;
    // never let it break a page or block a form.
  }
}

/** What every form posts alongside its own fields. */
export function getAttribution(): Record<string, string> | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = sessionStorage.getItem(ATTRIBUTION_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : undefined;
  } catch {
    return undefined;
  }
}

/**
 * The actions worth money. Keep this list short and stable — a conversion
 * that fires on everything optimises towards nothing.
 */
export type ConversionEvent =
  | "lead_checklist"
  | "lead_newsletter"
  | "lead_contact"
  | "lead_intake"
  | "booking_started"
  | "phone_click";

/**
 * Report a conversion to GA4, Google Ads and Meta at once.
 *
 * `sendGoogleAdsLabel` is the conversion label from the Ads UI — until a
 * campaign exists there is nothing to send, so the Ads half stays dormant
 * and only GA4 records the event.
 */
export function trackConversion(
  event: ConversionEvent,
  params: Record<string, string | number> = {}
) {
  if (typeof window === "undefined") return;

  const attribution = getAttribution() ?? {};
  const payload = { ...attribution, ...params };

  try {
    window.gtag?.("event", event, payload);

    const adsId = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID;
    const label = conversionLabel(event);
    if (adsId && label) {
      window.gtag?.("event", "conversion", {
        send_to: `${adsId}/${label}`,
        ...params,
      });
    }

    // Meta's standard events, which its optimiser actually understands.
    if (process.env.NEXT_PUBLIC_META_PIXEL_ID) {
      const metaEvent =
        event === "booking_started"
          ? "Schedule"
          : event === "phone_click"
          ? "Contact"
          : "Lead";
      window.fbq?.("track", metaEvent, params);
    }
  } catch (err) {
    // Analytics must never be able to break a form submission.
    console.debug("[analytics] event failed:", err);
  }
}

/**
 * Google Ads conversion labels, supplied per event once campaigns exist.
 * They live in env rather than in code so a new campaign does not require a
 * deploy — paste the label from the Ads UI and it starts counting.
 */
function conversionLabel(event: ConversionEvent) {
  const map: Partial<Record<ConversionEvent, string | undefined>> = {
    lead_checklist: process.env.NEXT_PUBLIC_ADS_LABEL_TIPS,
    lead_newsletter: process.env.NEXT_PUBLIC_ADS_LABEL_NEWSLETTER,
    lead_contact: process.env.NEXT_PUBLIC_ADS_LABEL_CONTACT,
    lead_intake: process.env.NEXT_PUBLIC_ADS_LABEL_INTAKE,
    booking_started: process.env.NEXT_PUBLIC_ADS_LABEL_BOOKING,
    phone_click: process.env.NEXT_PUBLIC_ADS_LABEL_PHONE,
  };
  return map[event];
}

/**
 * Tag every tel: link on the page.
 *
 * A phone call is the most valuable thing this site produces — tax clients
 * call, they do not fill in forms — and the easiest to lose track of, because
 * the visit ends the moment the call starts. This is
 * delegated from the document rather than wired per-link, so a number added
 * to any page later is counted without anyone remembering to instrument it.
 */
export function trackPhoneClicks() {
  if (typeof window === "undefined") return () => {};
  const handler = (e: MouseEvent) => {
    const link = (e.target as HTMLElement | null)?.closest?.("a[href^='tel:']");
    if (!link) return;
    trackConversion("phone_click", {
      number: (link as HTMLAnchorElement).href.replace("tel:", ""),
      page: window.location.pathname,
    });
  };
  document.addEventListener("click", handler);
  return () => document.removeEventListener("click", handler);
}
