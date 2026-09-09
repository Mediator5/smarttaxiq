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

/**
 * Mailchimp's Phone field type validates against a format — the audience shows
 * it as `(###) ### - ####`. Our forms collect whatever someone types, which is
 * usually `810-493-6605` or `8104936605`, neither of which matches.
 *
 * With `skip_merge_validation` the contact is accepted either way, so a badly
 * shaped number can never cost us the lead — but it can quietly fail to land
 * in the field, which is the same as not having collected it. Normalising here
 * means the number actually shows up on the contact.
 *
 * Anything that isn't a plain US number is passed through untouched rather
 * than mangled: better a value Mailchimp might reject than a wrong one it
 * accepts.
 */
function formatPhone(raw: string) {
  const digits = raw.replace(/\D/g, "");
  const local = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  if (local.length !== 10) return raw.trim();
  return `(${local.slice(0, 3)}) ${local.slice(3, 6)}-${local.slice(6)}`;
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
      // `skip_merge_validation=true` is deliberate and worth explaining.
      //
      // Mailchimp lets you mark a field "required" in the audience settings,
      // and then rejects any API write that omits it with a 400. That is
      // reasonable for someone typing into a Mailchimp signup form; it is
      // wrong here. The capture form on the SmartTaxIQ site asks for an email
      // address and nothing else, on purpose — every extra box costs more
      // signups than the data is worth — so if First Name were ever marked
      // required in the audience, every single one of those signups would be
      // rejected, silently, and the only clue would be a line in a server log.
      //
      // A lead with just an email address is still a lead. We would rather
      // store an incomplete contact than lose a real one to a validation rule
      // set in a different tool for a different purpose.
      `/lists/${AUDIENCE_ID()}/members/${subscriberHash(
        email
      )}?skip_merge_validation=true`,
      {
        method: "PUT",
        body: JSON.stringify({
          email_address: email,
          status_if_new: "subscribed",
          merge_fields: {
            ...(input.firstName ? { FNAME: input.firstName } : {}),
            ...(input.lastName ? { LNAME: input.lastName } : {}),
            ...(input.phone ? { PHONE: formatPhone(input.phone) } : {}),
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
