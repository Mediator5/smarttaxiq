import crypto from "crypto";
import type { AudienceInput, AudienceResult } from "./index";

/**
 * Mailchimp backend for the mailing list.
 *
 * Both websites point at the SAME api key and audience id, which is the whole
 * mechanism behind "one list": a signup on smarttaxiq.com and a signup on
 * cartercoleandassociates.com land as one contact set, kept tellable apart by
 * the `site-*` tag rather than by living in two places.
 */

const API_KEY = () => process.env.MAILCHIMP_API_KEY ?? "";
const AUDIENCE_ID = () => process.env.MAILCHIMP_AUDIENCE_ID ?? "";

/**
 * Mailchimp keys carry the data centre they belong to as a suffix — `-us21`,
 * `-us14` — and that suffix is the API subdomain. Reading it off the key is
 * one fewer value to ask for and one fewer to get wrong; the explicit
 * override exists only for the rare account where it differs.
 */
function serverPrefix() {
  const explicit = process.env.MAILCHIMP_SERVER_PREFIX;
  if (explicit) return explicit.trim();
  const tail = API_KEY().split("-")[1];
  return tail ? tail.trim() : "";
}

export function configured() {
  return Boolean(API_KEY() && AUDIENCE_ID() && serverPrefix());
}

/** Mailchimp addresses a member by the MD5 of their lowercased email. */
function subscriberHash(email: string) {
  return crypto
    .createHash("md5")
    .update(email.trim().toLowerCase())
    .digest("hex");
}

async function api(path: string, init: RequestInit) {
  return fetch(`https://${serverPrefix()}.api.mailchimp.com/3.0${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      // Basic auth with any username and the key as the password.
      Authorization: `Basic ${Buffer.from(`anystring:${API_KEY()}`).toString(
        "base64"
      )}`,
      ...(init.headers ?? {}),
    },
    // A slow third party must not hold a form submission open. If Mailchimp is
    // struggling the lead is already stored and the alert has fired.
    signal: AbortSignal.timeout(8000),
  });
}

/**
 * Add or update someone on the list.
 *
 * PUT is an upsert, so a returning subscriber updates rather than erroring.
 * `status_if_new` is the important part: it sets the status only when creating
 * the contact, so an existing unsubscribed member is never silently
 * resubscribed by filling in a form again. Someone who opted out stays opted
 * out — that matters legally as much as technically.
 */
export async function sync(input: AudienceInput): Promise<AudienceResult> {
  if (!configured()) return { ok: false, skipped: true };

  const email = input.email.trim().toLowerCase();

  try {
    const res = await api(
      `/lists/${AUDIENCE_ID()}/members/${subscriberHash(email)}`,
      {
        method: "PUT",
        body: JSON.stringify({
          email_address: email,
          status_if_new: "subscribed",
          merge_fields: {
            ...(input.firstName ? { FNAME: input.firstName } : {}),
            ...(input.lastName ? { LNAME: input.lastName } : {}),
            ...(input.phone ? { PHONE: input.phone } : {}),
            ...(input.source ? { SOURCE: input.source } : {}),
          },
        }),
      }
    );

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      return {
        ok: false,
        skipped: false,
        error: `Mailchimp ${res.status}: ${detail.slice(0, 300)}`,
      };
    }

    const body = (await res.json().catch(() => ({}))) as { status?: string };

    if (input.tags?.length) await applyTags(email, input.tags);

    return { ok: true, created: body.status === "subscribed" };
  } catch (err) {
    return {
      ok: false,
      skipped: false,
      error: err instanceof Error ? err.message : "unknown Mailchimp error",
    };
  }
}

/**
 * Tags are a separate endpoint. Failing to tag is not worth failing the whole
 * sync over — the contact is on the list, which is the part that cannot be
 * reconstructed later; the tags can be repaired from Supabase if they ever
 * need to be.
 */
async function applyTags(email: string, tags: string[]) {
  try {
    await api(`/lists/${AUDIENCE_ID()}/members/${subscriberHash(email)}/tags`, {
      method: "POST",
      body: JSON.stringify({
        tags: tags.map((name) => ({ name, status: "active" })),
      }),
    });
  } catch (err) {
    console.error("[mailchimp] tagging failed:", err);
  }
}

export async function unsubscribe(email: string) {
  if (!configured()) return;
  try {
    await api(
      `/lists/${AUDIENCE_ID()}/members/${subscriberHash(
        email.trim().toLowerCase()
      )}`,
      { method: "PATCH", body: JSON.stringify({ status: "unsubscribed" }) }
    );
  } catch (err) {
    console.error("[mailchimp] unsubscribe sync failed:", err);
  }
}

export async function ping() {
  if (!configured()) return { ok: false as const, error: "Not configured" };
  try {
    const res = await api(`/lists/${AUDIENCE_ID()}`, { method: "GET" });
    if (!res.ok) return { ok: false as const, error: `HTTP ${res.status}` };
    const body = (await res.json()) as {
      name?: string;
      stats?: { member_count?: number };
    };
    return {
      ok: true as const,
      provider: "mailchimp" as const,
      name: body.name ?? "(unnamed audience)",
      members: body.stats?.member_count ?? 0,
    };
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof Error ? err.message : "unknown error",
    };
  }
}
