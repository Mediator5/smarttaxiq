import { deliver, mailerConfigured, siteUrl } from "@/lib/mailer";
import { site, addressLine } from "@/lib/site";

/**
 * The one email the Academy sends: a sign-in code.
 *
 * Goes out over the same Resend HTTPS API as everything else on this site —
 * see src/lib/mailer.ts for why there is no SMTP anywhere in this codebase.
 * Styled to match the contact-form auto-reply so it does not arrive looking
 * like it came from a different company.
 */

const INK = "#081840";
const GOLD = "#d8b038";
const MUTED = "#5b6577";

function esc(v: string) {
  return v
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function sendLoginCode(input: {
  to: string;
  firstName: string;
  code: string;
  minutes: number;
}) {
  if (!mailerConfigured()) {
    // In development this is the normal case: there is no Resend key locally
    // and no reason to need one. Log the code so sign-in can still be tested
    // end to end. It never reaches a production log, because production has a
    // key and takes the branch below.
    console.warn(
      `[academy] no mailer configured — sign-in code for ${input.to} is ${input.code}`
    );
    return;
  }

  const name = esc(input.firstName);
  const url = `${siteUrl()}/academy`;

  const html = `<!doctype html><html><body style="margin:0;padding:24px;background:#eef1f6">
  <div style="max-width:540px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden">
    <div style="padding:20px 26px;background:${INK}">
      <p style="margin:0;font-family:Helvetica,Arial,sans-serif;font-size:19px;font-weight:700;color:#fff">
        Smart<span style="color:${GOLD}">TaxIQ</span>
        <span style="font-size:13px;font-weight:400;color:rgba(255,255,255,.6)"> &nbsp;Tax Academy</span>
      </p>
    </div>
    <div style="padding:26px">
      <p style="margin:0 0 18px;font-family:Helvetica,Arial,sans-serif;font-size:16px;line-height:1.7;color:${INK}">
        ${name}, here is your sign-in code.
      </p>
      <p style="margin:0 0 18px;padding:18px;background:#f2f5fa;border-radius:12px;text-align:center;
                font-family:'Courier New',Courier,monospace;font-size:34px;font-weight:700;
                letter-spacing:.22em;color:${INK}">
        ${esc(input.code)}
      </p>
      <p style="margin:0 0 16px;font-family:Helvetica,Arial,sans-serif;font-size:16px;line-height:1.7;color:${INK}">
        It works once and expires in ${input.minutes} minutes. Enter it on the
        page you just came from, or go to
        <a href="${url}" style="color:${INK}">${esc(url)}</a>.
      </p>
      <p style="margin:0 0 16px;font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.7;color:${MUTED}">
        If you did not ask for this, nothing has happened to your account and
        you can ignore this email.
      </p>
      <p style="margin:26px 0 0;padding-top:18px;border-top:1px solid #e6eaf1;font-family:Helvetica,Arial,sans-serif;font-size:12.5px;line-height:1.65;color:${MUTED}">
        ${esc(site.divisionStatement)}<br>
        ${esc(addressLine)} &middot; ${esc(site.phone)}
      </p>
    </div>
  </div>
</body></html>`;

  const text = `${input.firstName}, here is your Tax Academy sign-in code.

${input.code}

It works once and expires in ${input.minutes} minutes. Enter it on the page you just came from, or go to ${url}.

If you did not ask for this, nothing has happened to your account and you can ignore this email.

---
${site.divisionStatement}
${addressLine} · ${site.phone}`;

  await deliver({
    to: input.to,
    subject: `Your Tax Academy sign-in code: ${input.code}`,
    html,
    text,
  });
}
