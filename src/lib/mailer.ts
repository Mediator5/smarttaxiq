import { site, addressLine } from "./site";

/**
 * Outbound mail, over HTTPS only.
 *
 * This site has no nodemailer and no SMTP connection by design. Vercel and
 * most other serverless hosts throttle or block outbound SMTP, and a mail
 * host that hangs will hold a form submission open until the platform kills
 * the function — so mail goes out through Resend's HTTPS API instead, which
 * is a normal fetch with a normal timeout and adds no dependency to a project
 * that deliberately has almost none.
 *
 * Set RESEND_API_KEY and MAIL_FROM. Without them the site still runs and
 * still captures leads; it just cannot send, and says so in the log.
 */

const INK = "#081840";
const GOLD = "#d8b038";
const MUTED = "#5b6577";

export function mailerConfigured() {
  return Boolean(process.env.RESEND_API_KEY && fromAddress());
}

export function fromAddress() {
  return (
    process.env.MAIL_FROM ?? `${site.name} <no-reply@${hostFromUrl()}>`
  ).trim();
}

function hostFromUrl() {
  try {
    return new URL(site.url).host.replace(/^www\./, "");
  } catch {
    return "smarttaxiq.com";
  }
}

export function siteUrl() {
  return (process.env.SITE_URL ?? site.url).replace(/\/$/, "");
}

export type Message = {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
};

/** Throws on failure so the caller can decide whether that matters. */
export async function deliver(msg: Message): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY is not set");

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromAddress(),
      to: msg.to.split(",").map((s) => s.trim()).filter(Boolean),
      subject: msg.subject,
      html: msg.html,
      text: msg.text,
      ...(msg.replyTo ? { reply_to: msg.replyTo } : {}),
    }),
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Resend ${res.status}: ${detail.slice(0, 300)}`);
  }
}

function esc(v: string) {
  return v
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * The reply someone gets after using the contact form.
 *
 * Worth sending for its own sake: an instant, human-sounding acknowledgement
 * is the difference between a visitor who waits and a visitor who fills in
 * the next firm's form while they're at it.
 */
export function autoReply(name: string) {
  const html = `<!doctype html><html><body style="margin:0;padding:24px;background:#eef1f6">
  <div style="max-width:540px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden">
    <div style="padding:20px 26px;background:${INK}">
      <p style="margin:0;font-family:Helvetica,Arial,sans-serif;font-size:19px;font-weight:700;color:#fff">
        Smart<span style="color:${GOLD}">TaxIQ</span>
      </p>
    </div>
    <div style="padding:26px">
      <p style="margin:0 0 16px;font-family:Helvetica,Arial,sans-serif;font-size:16px;line-height:1.7;color:${INK}">
        ${esc(name)},
      </p>
      <p style="margin:0 0 16px;font-family:Helvetica,Arial,sans-serif;font-size:16px;line-height:1.7;color:${INK}">
        Thanks for getting in touch — your message has come through and I'll
        reply personally, usually the same business day.
      </p>
      <p style="margin:0 0 16px;font-family:Helvetica,Arial,sans-serif;font-size:16px;line-height:1.7;color:${INK}">
        If it's time-sensitive — an IRS notice with a deadline on it, or a
        filing date coming up — call ${site.phone} and we'll deal with it now
        rather than by email.
      </p>
      <p style="margin:24px 0 0;font-family:Helvetica,Arial,sans-serif;font-size:16px;line-height:1.7;color:${INK}">
        ${esc(site.preparer.name)}<br>
        <span style="color:${MUTED};font-size:14px">${esc(
    site.preparer.role
  )}</span>
      </p>
      <p style="margin:26px 0 0;padding-top:18px;border-top:1px solid #e6eaf1;font-family:Helvetica,Arial,sans-serif;font-size:12.5px;line-height:1.65;color:${MUTED}">
        ${esc(site.divisionStatement)}<br>
        ${esc(addressLine)} &middot; ${esc(site.phone)}
      </p>
    </div>
  </div>
</body></html>`;

  const text = `${name},

Thanks for getting in touch — your message has come through and I'll reply personally, usually the same business day.

If it's time-sensitive — an IRS notice with a deadline on it, or a filing date coming up — call ${site.phone} and we'll deal with it now rather than by email.

${site.preparer.name}
${site.preparer.role}

---
${site.divisionStatement}
${addressLine} · ${site.phone}`;

  return { html, text };
}
