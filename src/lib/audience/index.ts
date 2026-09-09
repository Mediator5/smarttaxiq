/**
 * The mailing list.
 *
 * Supabase, when configured, is the system of record — the same project the
 * Carter Cole site uses, so leads from both brands land in one dashboard.
 * This layer is the *broadcast copy*: the list you write a campaign against.
 * Point it at the same audience the other site uses and the two websites feed
 * one list, kept tellable apart by the `site-*` tag.
 *
 * Two providers are supported behind one interface, chosen by whichever
 * credentials are present:
 *
 *   Mailchimp  — MAILCHIMP_API_KEY + MAILCHIMP_AUDIENCE_ID
 *   Resend     — RESEND_API_KEY + RESEND_AUDIENCE_ID
 *
 * It is written this way on purpose. The choice of campaign tool is a business
 * decision that can reasonably change — on price, on who has to use the
 * interface, on what a plan's limits turn out to be in practice — and it
 * should not require touching the capture routes, the webhooks or the alert
 * layer when it does. Switching providers here is a change of environment
 * variables, not a change of code.
 *
 * The 5-email welcome sequence lives on the Carter Cole site and is unaffected
 * by any of this — it runs from that project's own code against Supabase, and
 * does not depend on the list provider having automation features at all.
 *
 * Nothing in this module throws. An outage, a bad key or a hit rate limit
 * must never cost a lead — the caller has already stored it.
 */

import * as mailchimp from "./mailchimp";
import * as resend from "./resend";

export type AudienceResult =
  | { ok: true; created: boolean }
  | { ok: false; skipped: true }
  | { ok: false; skipped: false; error: string };

export type AudienceInput = {
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  /**
   * Where this person came from — `site-cartercole`, `source-checklist`,
   * `kind-booking`, `campaign-spring-tax`. Mailchimp applies these as native
   * tags; Resend stores them as contact properties. Either way they are what
   * make a segment possible, so a broadcast can go to "business tax leads from
   * SmartTaxIQ this month" rather than to everyone, every time.
   */
  tags?: string[];
  source?: string;
};

export type Provider = "mailchimp" | "resend" | "none";

/**
 * Mailchimp wins when both are configured. It is the one with a campaign
 * interface a non-developer is expected to sit in front of, so if its
 * credentials are present that is a deliberate choice, not an accident.
 */
export function audienceProvider(): Provider {
  if (mailchimp.configured()) return "mailchimp";
  if (resend.configured()) return "resend";
  return "none";
}

export function audienceConfigured() {
  return audienceProvider() !== "none";
}

export async function syncToAudience(
  input: AudienceInput
): Promise<AudienceResult> {
  switch (audienceProvider()) {
    case "mailchimp":
      return mailchimp.sync(input);
    case "resend":
      return resend.sync(input);
    default:
      return { ok: false, skipped: true };
  }
}

/**
 * Mark someone unsubscribed on the broadcast list when they opt out on our
 * side. Without this the two lists drift, and someone who unsubscribed
 * through one of our sequence emails still receives the next campaign — which
 * is a complaint, and for commercial email a legal problem.
 */
export async function unsubscribeFromAudience(email: string) {
  switch (audienceProvider()) {
    case "mailchimp":
      return mailchimp.unsubscribe(email);
    case "resend":
      return resend.unsubscribe(email);
    default:
      return;
  }
}

/** Used by the setup checker to prove the credentials actually work. */
export async function pingAudience() {
  switch (audienceProvider()) {
    case "mailchimp":
      return mailchimp.ping();
    case "resend":
      return resend.ping();
    default:
      return { ok: false as const, error: "No list provider configured" };
  }
}
