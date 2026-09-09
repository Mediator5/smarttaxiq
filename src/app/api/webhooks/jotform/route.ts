import { NextResponse } from "next/server";
import { captureLead } from "@/lib/leads";

export const dynamic = "force-dynamic";

/**
 * JotForm intake webhook.
 *
 * The two tax intake forms are hosted by JotForm, which means submissions
 * historically landed in a JotForm inbox and nowhere else — outside the list,
 * outside the dashboard, and with no alert beyond whatever JotForm's own
 * notification settings happened to be. This closes that gap: an intake now
 * produces exactly the same lead record, list entry and instant alert as a
 * form hosted on the site.
 *
 * Set the URL below as a webhook on BOTH forms
 * (JotForm → Settings → Integrations → Webhooks):
 *
 *   https://smarttaxiq.com/api/webhooks/jotform?key=YOUR_SECRET&form=personal
 *   https://smarttaxiq.com/api/webhooks/jotform?key=YOUR_SECRET&form=business
 *
 * `YOUR_SECRET` is JOTFORM_WEBHOOK_SECRET. JotForm cannot sign its payloads,
 * so a shared secret in the query string is the available protection: without
 * it, anyone who guessed the path could inject junk into the mailing list.
 */

/**
 * JotForm posts `multipart/form-data` with the answers under `rawRequest` as
 * a JSON string, keyed by internal field ids like `q3_name`. Those ids differ
 * per form and change if fields are reordered, so nothing here depends on
 * them: fields are found by what the key looks like, which survives editing
 * the form.
 */
function flatten(raw: unknown, out: Record<string, string> = {}) {
  if (!raw || typeof raw !== "object") return out;
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (value == null) continue;
    if (typeof value === "string" || typeof value === "number") {
      const v = String(value).trim();
      if (v) out[key.toLowerCase()] = v;
    } else if (typeof value === "object") {
      // Name and address fields arrive as objects: { first, last } etc.
      const parts = Object.values(value as Record<string, unknown>)
        .filter((p) => typeof p === "string" && p.trim())
        .join(" ")
        .trim();
      if (parts) out[key.toLowerCase()] = parts;
      flatten(value, out);
    }
  }
  return out;
}

function pick(fields: Record<string, string>, ...needles: string[]) {
  for (const needle of needles) {
    const hit = Object.entries(fields).find(
      ([k, v]) => k.includes(needle) && v
    );
    if (hit) return hit[1];
  }
  return undefined;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

export async function POST(request: Request) {
  const url = new URL(request.url);
  const secret = process.env.JOTFORM_WEBHOOK_SECRET;

  if (secret && url.searchParams.get("key") !== secret) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const which = url.searchParams.get("form") === "business" ? "business" : "personal";

  let fields: Record<string, string> = {};
  try {
    const contentType = request.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      fields = flatten(await request.json());
    } else {
      const form = await request.formData();
      const raw = form.get("rawRequest");
      if (typeof raw === "string") {
        fields = flatten(JSON.parse(raw));
      } else {
        form.forEach((v, k) => {
          if (typeof v === "string") fields[k.toLowerCase()] = v;
        });
      }
    }
  } catch (err) {
    console.error("[jotform] could not parse submission:", err);
    // Always 200 back to JotForm. A non-2xx makes it retry the same broken
    // payload on a schedule, and the submission is safe in JotForm regardless.
    return NextResponse.json({ ok: true, parsed: false });
  }

  const email = pick(fields, "email", "e-mail");
  const name = pick(fields, "name", "fullname", "yourname");
  const phone = pick(fields, "phone", "mobile", "cell", "telephone");

  if (!email || !EMAIL_RE.test(email)) {
    console.warn("[jotform] submission had no usable email; alerting anyway.");
  }

  const [firstName, ...rest] = (name ?? "").split(/\s+/).filter(Boolean);

  try {
    await captureLead({
      kind: which === "business" ? "intake-business" : "intake-personal",
      email: email && EMAIL_RE.test(email) ? email : `unknown+${Date.now()}@jotform.invalid`,
      firstName: firstName || "New",
      lastName: rest.join(" ") || undefined,
      phone,
      topic: which === "business" ? "Business tax return" : "Personal tax return",
      source: `jotform-${which}`,
      page: "/start",
      // An intake is someone becoming a client — squarely a marketing opt-in
      // under the relationship they have just started, and the one signup
      // most worth having on the list.
      subscribe: Boolean(email && EMAIL_RE.test(email)),
      extra: {
        Form: which === "business" ? "Business intake" : "Personal intake",
        "Submission ID": fields["submissionid"] ?? fields["submission_id"],
      },
    });
  } catch (err) {
    console.error("[jotform] capture failed:", err);
  }

  return NextResponse.json({ ok: true });
}

/** JotForm pings the URL with GET when you save it. Answer so it validates. */
export async function GET() {
  return NextResponse.json({ ok: true, endpoint: "jotform-webhook" });
}
