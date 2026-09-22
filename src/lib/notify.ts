import { deliver, mailerConfigured, siteUrl } from "./mailer";
import { site } from "./site";

/**
 * Lead alerts.
 *
 * Speed of response is the whole game in this business: a tax lead that gets a
 * call back in five minutes converts at a wildly different rate to one called
 * back tomorrow. So every capture on either site fires an alert here the
 * moment it lands — email always, SMS when Twilio credentials are present.
 *
 * Both channels are best-effort and independently guarded. The lead is already
 * saved to the database and pushed to the list before this runs; an alert
 * failing is an inconvenience, never a lost client.
 */

const NAVY = "#081840";
const GOLD = "#d8b038";
const MUTED = "#5b6577";

export type LeadAlert = {
  /** What produced this lead — drives the subject line and the SMS wording. */
  kind:
    | "checklist"
    | "newsletter"
    | "contact"
    | "intake-personal"
    | "intake-business"
    | "booking"
    | "application";
  name?: string;
  email?: string;
  phone?: string;
  /** Department, topic, or whatever the form called its routing field. */
  topic?: string;
  message?: string;
  /** Page the form was submitted from. */
  page?: string;
  /** Campaign attribution captured from the visitor's session. */
  utm?: Record<string, string>;
  /** Which website produced it, for the two-site setup. */
  brand?: string;
  /** Anything else worth showing, rendered as a plain label/value list. */
  extra?: Record<string, string | undefined>;
};

const LABELS: Record<LeadAlert["kind"], string> = {
  checklist: "Tax tips signup",
  newsletter: "Deadline updates signup",
  contact: "Contact form",
  "intake-personal": "Personal tax intake",
  "intake-business": "Business tax intake",
  booking: "Consultation booked",
  application: "Preparer application",
};

/** Leads worth interrupting someone's day for. A newsletter signup is not. */
const SMS_WORTHY: LeadAlert["kind"][] = [
  "contact",
  "intake-personal",
  "intake-business",
  "booking",
  "application",
];

function recipients(): string[] {
  const raw =
    process.env.LEAD_NOTIFY_EMAIL ||
    process.env.MAIL_REPLY_TO ||
    site.email ||
    "";
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function smsConfigured() {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_FROM_NUMBER &&
      process.env.LEAD_NOTIFY_SMS
  );
}

export function notifyConfigured() {
  return mailerConfigured() || smsConfigured();
}

function esc(v: string) {
  return v
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function rows(alert: LeadAlert) {
  const entries: [string, string | undefined][] = [
    ["Name", alert.name],
    ["Email", alert.email],
    ["Phone", alert.phone],
    ["Topic", alert.topic],
    ["Brand", alert.brand],
    ["Page", alert.page],
    ...Object.entries(alert.extra ?? {}),
  ];

  const utm = alert.utm ?? {};
  if (utm.utm_source) entries.push(["Campaign source", utm.utm_source]);
  if (utm.utm_medium) entries.push(["Campaign medium", utm.utm_medium]);
  if (utm.utm_campaign) entries.push(["Campaign", utm.utm_campaign]);
  if (utm.utm_term) entries.push(["Keyword", utm.utm_term]);
  if (utm.gclid) entries.push(["Google click ID", utm.gclid]);

  return entries.filter(([, v]) => v && String(v).trim() !== "") as [
    string,
    string
  ][];
}

/**
 * The alert email. Deliberately plain and scannable — this is read on a phone,
 * usually while doing something else, and the only job is to make replying
 * fast. The reply-to is set to the lead's own address so hitting reply in any
 * mail client goes straight to them.
 */
function buildEmail(alert: LeadAlert) {
  const label = LABELS[alert.kind];
  const who = alert.name || alert.email || "Someone";
  const list = rows(alert)
    .map(
      ([k, v]) => `
    <tr>
      <td style="padding:8px 16px 8px 0;font-family:Helvetica,Arial,sans-serif;font-size:13px;color:${MUTED};white-space:nowrap;vertical-align:top">${esc(
        k
      )}</td>
      <td style="padding:8px 0;font-family:Helvetica,Arial,sans-serif;font-size:15px;color:${NAVY};vertical-align:top">${esc(
        v
      )}</td>
    </tr>`
    )
    .join("");

  const messageBlock = alert.message
    ? `<div style="margin:22px 0 0;padding:16px 18px;background:#f7f5f0;border-left:3px solid ${GOLD};font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.65;color:${NAVY};white-space:pre-wrap">${esc(
        alert.message
      )}</div>`
    : "";

  const callButton = alert.phone
    ? `<a href="tel:${alert.phone.replace(
        /[^\d+]/g,
        ""
      )}" style="display:inline-block;margin:0 8px 8px 0;padding:12px 22px;background:${NAVY};color:#fff;text-decoration:none;border-radius:999px;font-family:Helvetica,Arial,sans-serif;font-size:14px;font-weight:600">Call ${esc(
        alert.phone
      )}</a>`
    : "";

  const emailButton = alert.email
    ? `<a href="mailto:${esc(
        alert.email
      )}" style="display:inline-block;margin:0 8px 8px 0;padding:12px 22px;background:${GOLD};color:${NAVY};text-decoration:none;border-radius:999px;font-family:Helvetica,Arial,sans-serif;font-size:14px;font-weight:700">Email them</a>`
    : "";

  const html = `<!doctype html><html><body style="margin:0;padding:24px;background:#eef0f4">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden">
    <div style="padding:18px 24px;background:${NAVY}">
      <p style="margin:0;font-family:Helvetica,Arial,sans-serif;font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:${GOLD}">New lead &middot; ${esc(
    label
  )}</p>
      <p style="margin:6px 0 0;font-family:Helvetica,Arial,sans-serif;font-size:21px;font-weight:700;color:#fff">${esc(
        who
      )}</p>
    </div>
    <div style="padding:22px 24px">
      <table style="width:100%;border-collapse:collapse">${list}</table>
      ${messageBlock}
      <div style="margin-top:24px">${callButton}${emailButton}</div>
      <p style="margin:22px 0 0;font-family:Helvetica,Arial,sans-serif;font-size:12px;color:${MUTED}">
        Received ${new Date().toLocaleString("en-US", {
          timeZone: "America/New_York",
          dateStyle: "medium",
          timeStyle: "short",
        })} ET &middot; from <a href="${siteUrl()}" style="color:${MUTED}">${
    new URL(siteUrl()).host
  }</a>
      </p>
    </div>
  </div>
</body></html>`;

  const text = [
    `NEW LEAD — ${label}`,
    "",
    ...rows(alert).map(([k, v]) => `${k}: ${v}`),
    alert.message ? `\nMessage:\n${alert.message}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  return { html, text, label, who };
}

/** Under 320 characters so it lands as one or two SMS segments, not five. */
function buildSms(alert: LeadAlert) {
  const label = LABELS[alert.kind];
  const parts = [
    `NEW LEAD (${label})`,
    alert.name,
    alert.phone,
    alert.email,
    alert.topic ? `Re: ${alert.topic}` : undefined,
    alert.brand,
  ].filter(Boolean);
  return parts.join(" | ").slice(0, 320);
}

async function sendSms(body: string) {
  const sid = process.env.TWILIO_ACCOUNT_SID!;
  const token = process.env.TWILIO_AUTH_TOKEN!;
  const from = process.env.TWILIO_FROM_NUMBER!;
  const to = (process.env.LEAD_NOTIFY_SMS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  await Promise.allSettled(
    to.map(async (number) => {
      const res = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString(
              "base64"
            )}`,
          },
          body: new URLSearchParams({ To: number, From: from, Body: body }),
          signal: AbortSignal.timeout(8000),
        }
      );
      if (!res.ok) {
        const detail = await res.text().catch(() => "");
        throw new Error(`Twilio ${res.status}: ${detail.slice(0, 200)}`);
      }
    })
  );
}

/**
 * Fire both channels. Never throws — call it without awaiting the result if
 * the caller is on a request path that should return immediately.
 */
export async function notifyNewLead(alert: LeadAlert) {
  const { html, text, label, who } = buildEmail(alert);
  const to = recipients();

  const jobs: Promise<unknown>[] = [];

  if (mailerConfigured() && to.length) {
    jobs.push(
      deliver({
        to: to.join(", "),
        subject: `New lead — ${label}: ${who}`,
        html,
        text,
        // Reply goes to the lead, not to us. Saves a copy-paste every time.
        replyTo: alert.email,
      }).catch((err) => console.error("[notify] email failed:", err))
    );
  } else if (!mailerConfigured()) {
    console.warn("[notify] mailer not configured — lead alert email skipped.");
  }

  if (smsConfigured() && SMS_WORTHY.includes(alert.kind)) {
    jobs.push(
      sendSms(buildSms(alert)).catch((err) =>
        console.error("[notify] SMS failed:", err)
      )
    );
  }

  await Promise.allSettled(jobs);
}
