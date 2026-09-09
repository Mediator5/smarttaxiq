import { upsertSubscriber } from "./store";
import { syncToAudience } from "./audience";
import { notifyNewLead, type LeadAlert } from "./notify";

/**
 * One entry point for every lead this site captures.
 *
 * Same contract as the equivalent file on the Carter Cole site, so the two
 * behave identically without sharing code: store, sync to the one Resend
 * audience, alert the office, and carry the campaign that produced the visit.
 *
 * Each step is independently guarded. Storage is optional here (this site can
 * run with no database at all), so unlike the other site a storage failure is
 * not fatal — as long as the lead reached the list or an alert, it is not
 * lost, and the visitor is never shown an error for a back-office problem.
 */

export type LeadKind = LeadAlert["kind"];

export const BRAND_TAG = "site-smarttaxiq";
export const BRAND_NAME = "SmartTaxIQ";

export type CaptureInput = {
  kind: LeadKind;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  topic?: string;
  message?: string;
  source: string;
  page?: string;
  utm?: Record<string, string>;
  extra?: Record<string, string | undefined>;
  /** Only true where the person actually asked to receive email. */
  subscribe?: boolean;
};

export type CaptureResult = {
  ok: boolean;
  stored: "stored" | "skipped" | "failed";
  audience: "synced" | "skipped" | "failed";
};

function tagsFor(input: CaptureInput) {
  const tags = [BRAND_TAG, `source-${input.source}`, `kind-${input.kind}`];
  const campaign = input.utm?.utm_campaign;
  if (campaign) tags.push(`campaign-${campaign}`.slice(0, 90));
  return tags;
}

export async function captureLead(
  input: CaptureInput
): Promise<CaptureResult> {
  const email = input.email.trim().toLowerCase();
  const result: CaptureResult = {
    ok: false,
    stored: "skipped",
    audience: "skipped",
  };

  const [stored, mc] = await Promise.allSettled([
    upsertSubscriber({
      email,
      firstName: input.firstName || email.split("@")[0],
      lastName: input.lastName,
      source: input.source,
    }),
    input.subscribe === false
      ? Promise.resolve({ ok: false as const, skipped: true as const })
      : syncToAudience({
          email,
          firstName: input.firstName,
          lastName: input.lastName,
          phone: input.phone,
          source: input.source,
          tags: tagsFor(input),
        }),
    notifyNewLead({
      kind: input.kind,
      name:
        [input.firstName, input.lastName].filter(Boolean).join(" ") ||
        undefined,
      email,
      phone: input.phone,
      topic: input.topic,
      message: input.message,
      page: input.page,
      utm: input.utm,
      brand: BRAND_NAME,
      extra: input.extra,
    }),
  ]);

  if (stored.status === "fulfilled") {
    result.stored = stored.value ? "stored" : "skipped";
    result.ok = true;
  } else {
    result.stored = "failed";
    console.error("[leads] storage failed:", stored.reason);
  }

  if (mc.status === "fulfilled") {
    const v = mc.value;
    if (v.ok) {
      result.audience = "synced";
      result.ok = true;
    } else if ("skipped" in v && v.skipped) {
      result.audience = "skipped";
    } else {
      result.audience = "failed";
      console.error(
        "[leads] audience sync failed:",
        "error" in v ? v.error : "unknown"
      );
    }
  } else {
    result.audience = "failed";
  }

  return result;
}

/**
 * Campaign attribution — the UTM parameters and click IDs a visitor arrived
 * with, replayed from sessionStorage into every form so a lead captured four
 * pages deep still names the ad that produced it. Without this there is no
 * honest way to judge what an ad spend actually bought.
 */
const ATTRIBUTION_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "gclid",
  "fbclid",
  "msclkid",
] as const;

export function readAttribution(
  raw: unknown
): Record<string, string> | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const src = raw as Record<string, unknown>;
  const out: Record<string, string> = {};
  for (const key of ATTRIBUTION_KEYS) {
    const value = src[key];
    if (typeof value === "string" && value.trim()) {
      out[key] = value.trim().slice(0, 200);
    }
  }
  return Object.keys(out).length ? out : undefined;
}

/**
 * Wait for background work, but never longer than `ms`.
 *
 * This exists because of how serverless hosting actually behaves. It is
 * tempting to fire the Mailchimp sync and the alert off without awaiting them
 * — the lead is already stored, so why make the visitor wait? On a long-lived
 * Node server that reasoning is correct. On Vercel and every other serverless
 * platform it is wrong: once the handler returns its response the function is
 * frozen or torn down, and any promise still in flight is simply abandoned.
 * No error, no log, no retry. The signup succeeds, the visitor gets their
 * download, and the contact silently never reaches the list.
 *
 * So the work is awaited — but bounded, so a third party having a bad day
 * cannot leave someone staring at a spinner. Normal case is a few hundred
 * milliseconds; worst case the visitor waits `ms` and the request completes
 * regardless, because storage already happened and is what actually matters.
 */
export async function settleWithin(
  ms: number,
  jobs: Promise<unknown>[]
): Promise<void> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const cap = new Promise<void>((resolve) => {
    timer = setTimeout(resolve, ms);
  });
  try {
    await Promise.race([Promise.allSettled(jobs).then(() => undefined), cap]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
