import type { AudienceInput, AudienceResult } from "./index";

/**
 * Resend backend for the mailing list.
 *
 * Kept alongside the Mailchimp one because the site already sends every email
 * through Resend, so this needs no second account, no second key and no second
 * set of unsubscribe state. It becomes active simply by setting
 * RESEND_AUDIENCE_ID and clearing the Mailchimp variables — useful if the
 * campaign tool is ever reconsidered on price or on plan limits.
 */

const API_KEY = () => process.env.RESEND_API_KEY ?? "";
const AUDIENCE_ID = () => process.env.RESEND_AUDIENCE_ID ?? "";

export function configured() {
  return Boolean(API_KEY() && AUDIENCE_ID());
}

async function api(path: string, init: RequestInit) {
  return fetch(`https://api.resend.com${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY()}`,
      ...(init.headers ?? {}),
    },
    signal: AbortSignal.timeout(8000),
  });
}

/**
 * Resend properties are flat string key/values rather than free-form tags, so
 * the structured parts of each tag get their own key — which segments better
 * anyway — and the full list is kept as one searchable string alongside them.
 */
function propertiesFor(input: AudienceInput) {
  const props: Record<string, string> = {};
  if (input.source) props.source = input.source;
  if (input.phone) props.phone = input.phone;

  for (const tag of input.tags ?? []) {
    const [prefix, ...rest] = tag.split("-");
    const value = rest.join("-");
    if (!value) continue;
    if (prefix === "site") props.site = value;
    else if (prefix === "kind") props.kind = value;
    else if (prefix === "campaign") props.campaign = value;
  }

  if (input.tags?.length) props.tags = input.tags.join(",").slice(0, 500);
  props.joined = new Date().toISOString().slice(0, 10);
  return props;
}

/**
 * Create, then fall back to update when the contact already exists — the
 * standard upsert against this API. The update deliberately does not send
 * `unsubscribed: false`, so someone who opted out stays opted out.
 */
export async function sync(input: AudienceInput): Promise<AudienceResult> {
  if (!configured()) return { ok: false, skipped: true };

  const email = input.email.trim().toLowerCase();

  try {
    const created = await api("/contacts", {
      method: "POST",
      body: JSON.stringify({
        email,
        ...(input.firstName ? { first_name: input.firstName } : {}),
        ...(input.lastName ? { last_name: input.lastName } : {}),
        properties: propertiesFor(input),
        audience_id: AUDIENCE_ID(),
      }),
    });

    if (created.ok) return { ok: true, created: true };

    if (created.status === 409 || created.status === 422) {
      const updated = await api(`/contacts/${encodeURIComponent(email)}`, {
        method: "PATCH",
        body: JSON.stringify({
          ...(input.firstName ? { first_name: input.firstName } : {}),
          ...(input.lastName ? { last_name: input.lastName } : {}),
          properties: propertiesFor(input),
        }),
      });
      if (updated.ok) return { ok: true, created: false };
      const detail = await updated.text().catch(() => "");
      return {
        ok: false,
        skipped: false,
        error: `Resend update ${updated.status}: ${detail.slice(0, 300)}`,
      };
    }

    const detail = await created.text().catch(() => "");
    return {
      ok: false,
      skipped: false,
      error: `Resend create ${created.status}: ${detail.slice(0, 300)}`,
    };
  } catch (err) {
    return {
      ok: false,
      skipped: false,
      error: err instanceof Error ? err.message : "unknown Resend error",
    };
  }
}

export async function unsubscribe(email: string) {
  if (!configured()) return;
  try {
    await api(`/contacts/${encodeURIComponent(email.trim().toLowerCase())}`, {
      method: "PATCH",
      body: JSON.stringify({ unsubscribed: true }),
    });
  } catch (err) {
    console.error("[resend-audience] unsubscribe sync failed:", err);
  }
}

export async function ping() {
  if (!configured()) return { ok: false as const, error: "Not configured" };
  try {
    const res = await api(`/audiences/${AUDIENCE_ID()}`, { method: "GET" });
    if (!res.ok) return { ok: false as const, error: `HTTP ${res.status}` };
    const body = (await res.json()) as { name?: string };
    return {
      ok: true as const,
      provider: "resend" as const,
      name: body.name ?? "(unnamed audience)",
      members: 0,
    };
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof Error ? err.message : "unknown error",
    };
  }
}
