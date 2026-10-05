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
    // end to end.
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        `[academy] no mailer configured — sign-in code for ${input.to} is ${input.code}`
      );
      return;
    }
    // In production it is a fault, and it must NOT be swallowed. Returning
    // quietly here tells the student "a code is on its way" and sends nothing,
    // which from their side is indistinguishable from not being on the roster
    // — the single most confusing failure this system can produce.
    throw new Error(
      "RESEND_API_KEY is missing in production — no sign-in code was sent"
    );
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


/**
 * Tell the office that somebody has asked to be added to the roster.
 *
 * Goes to LEAD_NOTIFY_EMAIL, the same address that already receives contact
 * and application alerts, so this needs no new configuration. Reply-to is set
 * to the person asking, so answering them is one click rather than a
 * copy-paste.
 *
 * Never throws. A request that reached the database is not lost just because
 * the alert failed, and the person asking should not see an error for a
 * back-office problem — the dashboard shows it either way.
 */
export async function sendAccessRequestAlert(input: {
  email: string;
  name: string;
  note?: string | null;
}) {
  const to = process.env.LEAD_NOTIFY_EMAIL;
  if (!to || !mailerConfigured()) {
    console.warn(
      "[academy] access request received but no alert sent — LEAD_NOTIFY_EMAIL or RESEND_API_KEY missing"
    );
    return;
  }

  const name = esc(input.name);
  const email = esc(input.email);
  const note = input.note ? esc(input.note) : "";

  const html = `<!doctype html><html><body style="margin:0;padding:24px;background:#eef1f6">
  <div style="max-width:540px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden">
    <div style="padding:20px 26px;background:${INK}">
      <p style="margin:0;font-family:Helvetica,Arial,sans-serif;font-size:19px;font-weight:700;color:#fff">
        Smart<span style="color:${GOLD}">TaxIQ</span>
        <span style="font-size:13px;font-weight:400;color:rgba(255,255,255,.6)"> &nbsp;Tax Academy</span>
      </p>
    </div>
    <div style="padding:26px">
      <p style="margin:0 0 16px;font-family:Helvetica,Arial,sans-serif;font-size:16px;line-height:1.7;color:${INK}">
        <strong>${name}</strong> tried to sign in to the Academy and is not on
        the roster. They have asked to be added.
      </p>
      <p style="margin:0 0 6px;font-family:Helvetica,Arial,sans-serif;font-size:15px;color:${MUTED}">Email</p>
      <p style="margin:0 0 16px;font-family:Helvetica,Arial,sans-serif;font-size:16px;color:${INK}">${email}</p>
      ${
        note
          ? `<p style="margin:0 0 6px;font-family:Helvetica,Arial,sans-serif;font-size:15px;color:${MUTED}">What they said</p>
             <p style="margin:0 0 16px;padding:14px;background:#f2f5fa;border-radius:10px;font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.7;color:${INK}">${note}</p>`
          : ""
      }
      <p style="margin:22px 0 0;font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.7;color:${MUTED}">
        Nothing has been granted. To enrol them, add a row to
        <code>academy_students</code>; the Instructor view lists every open
        request with the exact statement to run.
      </p>
    </div>
  </div>
</body></html>`;

  const text = `${input.name} tried to sign in to the Academy and is not on the roster. They have asked to be added.

Email: ${input.email}
${input.note ? `\nWhat they said:\n${input.note}\n` : ""}
Nothing has been granted. To enrol them, add a row to academy_students — the Instructor view lists every open request with the exact statement to run.`;

  try {
    await deliver({
      to,
      subject: `Academy access request — ${input.name}`,
      html,
      text,
      replyTo: input.email,
    });
  } catch (err) {
    console.error("[academy] access request alert failed to send:", err);
  }
}


/**
 * Email an announcement to the cohort.
 *
 * One message per student rather than one message to everybody: five trainees
 * should not be able to see each other's addresses, and a reply should reach
 * the instructor rather than the whole class. Sent sequentially, which is fine
 * at this size and keeps us well inside Resend's rate limit.
 *
 * Never throws. The announcement is already saved and visible on the course
 * page by the time this runs, so a failed send degrades to "posted but not
 * emailed" — the caller reports the count and the page says what happened.
 */
export async function sendAnnouncement(input: {
  recipients: { email: string; first_name: string }[];
  body: string;
  fromName: string;
}): Promise<{ sent: number; failed: string[] }> {
  if (!mailerConfigured()) {
    console.warn("[academy] announcement not emailed — no mailer configured");
    return { sent: 0, failed: input.recipients.map((r) => r.email) };
  }

  const url = `${siteUrl()}/academy`;
  const failed: string[] = [];
  let sent = 0;

  // Preserve the paragraph breaks she typed; escape everything else.
  const paras = input.body
    .split(/\n{2,}/)
    .map((p) => esc(p.trim()).replace(/\n/g, "<br>"))
    .filter(Boolean);

  for (const person of input.recipients) {
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
        ${esc(person.first_name)},
      </p>
      ${paras
        .map(
          (p) =>
            `<p style="margin:0 0 16px;font-family:Helvetica,Arial,sans-serif;font-size:16px;line-height:1.7;color:${INK}">${p}</p>`
        )
        .join("")}
      <p style="margin:26px 0 0;font-family:Helvetica,Arial,sans-serif;font-size:16px;line-height:1.7;color:${INK}">
        ${esc(input.fromName)}
      </p>
      <p style="margin:24px 0 0;padding-top:18px;border-top:1px solid #e6eaf1;font-family:Helvetica,Arial,sans-serif;font-size:13.5px;line-height:1.65;color:${MUTED}">
        This is also on the course page:
        <a href="${url}" style="color:${INK}">${esc(url)}</a>
      </p>
    </div>
  </div>
</body></html>`;

    const text = `${person.first_name},

${input.body}

${input.fromName}

---
This is also on the course page: ${url}`;

    try {
      await deliver({
        to: person.email,
        subject: `Tax Academy — a note from ${input.fromName}`,
        html,
        text,
      });
      sent += 1;
    } catch (err) {
      console.error(`[academy] announcement to ${person.email} failed:`, err);
      failed.push(person.email);
    }
  }

  return { sent, failed };
}


/**
 * Send a preparer their one-off onboarding link.
 *
 * The link is the credential, so this email is the delivery mechanism for a
 * secret and is treated like the sign-in code above: a missing mailer in
 * production throws rather than reporting a send that never happened.
 *
 * The tone matters more here than in the other three. This usually arrives
 * before the person has any relationship with the practice beyond a
 * conversation, and an email asking for a professional credential out of
 * nowhere looks exactly like a phishing attempt unless it says who it is from
 * and what it will and will not ask for.
 */
export async function sendIntakeLink(input: {
  to: string;
  firstName: string;
  url: string;
  days: number;
  fromName: string;
}) {
  if (!mailerConfigured()) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        `[academy] no mailer configured — intake link for ${input.to} is ${input.url}`
      );
      return;
    }
    throw new Error(
      "RESEND_API_KEY is missing in production — no intake link was sent"
    );
  }

  const name = esc(input.firstName);
  const from = esc(input.fromName);
  const url = input.url;

  const html = `<!doctype html><html><body style="margin:0;padding:24px;background:#eef1f6">
  <div style="max-width:540px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden">
    <div style="padding:20px 26px;background:${INK}">
      <p style="margin:0;font-family:Helvetica,Arial,sans-serif;font-size:19px;font-weight:700;color:#fff">
        Smart<span style="color:${GOLD}">TaxIQ</span>
        <span style="font-size:13px;font-weight:400;color:rgba(255,255,255,.6)"> &nbsp;Preparer onboarding</span>
      </p>
    </div>
    <div style="padding:26px">
      <p style="margin:0 0 18px;font-family:Helvetica,Arial,sans-serif;font-size:16px;line-height:1.7;color:${INK}">
        ${name}, there are two things we need from you before the season
        starts. ${from} has set up a page for them.
      </p>
      <p style="margin:0 0 22px;font-family:Helvetica,Arial,sans-serif;font-size:16px;line-height:1.7;color:${INK}">
        It takes about two minutes: your <strong>PTIN</strong>, and your
        signature on our security plan once you have read it.
      </p>
      <p style="margin:0 0 22px;text-align:center">
        <a href="${url}" style="display:inline-block;padding:14px 28px;background:${GOLD};border-radius:10px;
           font-family:Helvetica,Arial,sans-serif;font-size:16px;font-weight:700;color:${INK};text-decoration:none">
          Open your onboarding page
        </a>
      </p>
      <p style="margin:0 0 18px;padding:14px;background:#f2f5fa;border-radius:10px;
                font-family:Helvetica,Arial,sans-serif;font-size:14.5px;line-height:1.7;color:${INK}">
        <strong>This page will never ask for your Social Security number,
        your bank details or a password.</strong> If a page claiming to be
        ours asks for any of those, close it and call us on ${esc(site.phone)}.
      </p>
      <p style="margin:0 0 16px;font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.7;color:${MUTED}">
        Your W-9 is handled separately — a request for it will arrive from our
        filing service in its own email. That is the only place your Social
        Security number should ever be typed.
      </p>
      <p style="margin:0 0 16px;font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.7;color:${MUTED}">
        The link works once and expires in ${input.days} days. If it has run
        out, reply to this email and we will send a new one.
      </p>
      <p style="margin:26px 0 0;padding-top:18px;border-top:1px solid #e6eaf1;font-family:Helvetica,Arial,sans-serif;font-size:12.5px;line-height:1.65;color:${MUTED}">
        ${esc(site.divisionStatement)}<br>
        ${esc(addressLine)} &middot; ${esc(site.phone)}
      </p>
    </div>
  </div>
</body></html>`;

  const text = `${input.firstName}, there are two things we need from you before the season starts. ${input.fromName} has set up a page for them.

It takes about two minutes: your PTIN, and your signature on our security plan once you have read it.

${url}

This page will never ask for your Social Security number, your bank details or a password. If a page claiming to be ours asks for any of those, close it and call us on ${site.phone}.

Your W-9 is handled separately — a request for it will arrive from our filing service in its own email. That is the only place your Social Security number should ever be typed.

The link works once and expires in ${input.days} days. If it has run out, reply to this email and we will send a new one.

---
${site.divisionStatement}
${addressLine} · ${site.phone}`;

  await deliver({
    to: input.to,
    subject: `${input.fromName} — two things before the season starts`,
    html,
    text,
  });
}
