import { NextResponse } from "next/server";
import { saveContactSubmission } from "@/lib/store";
import { notifyNewLead } from "@/lib/notify";
import { readAttribution, settleWithin } from "@/lib/leads";
import { deliver, mailerConfigured } from "@/lib/mailer";
import { site } from "@/lib/site";

export const dynamic = "force-dynamic";

/**
 * Preparer job applications.
 *
 * Deliberately separate from /api/subscribe and /api/contact, and deliberately
 * NOT wired to the mailing list. Someone applying for a job has not asked to
 * hear about tax deadlines, and putting applicants into a marketing audience
 * is both a bad experience and the kind of thing that earns spam complaints.
 *
 * Applications are stored as contact submissions with department "application"
 * so they appear in the existing admin dashboard with no schema change, and
 * the answers are written into the message field in a readable block.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;
const MAX = { name: 120, email: 200, phone: 40, note: 2000 };

const ROLES: Record<string, string> = {
  remote: "Remote preparer (3 seats)",
  office: "In-office preparer (2 seats)",
  either: "Either — open to both",
};

const EXPERIENCE: Record<string, string> = {
  none: "Never prepared returns",
  some: "1–2 seasons",
  lots: "3+ seasons",
};

const PTIN: Record<string, string> = {
  yes: "Yes, has a PTIN",
  no: "No PTIN",
  unsure: "Doesn't know",
};

const YESNO: Record<string, string> = { yes: "Yes", no: "No" };

// Small in-memory rate limit: 5 applications per IP per 10 minutes.
const hits = new Map<string, number[]>();
function rateLimited(ip: string) {
  const now = Date.now();
  const list = (hits.get(ip) || []).filter((t) => now - t < 10 * 60 * 1000);
  list.push(now);
  hits.set(ip, list);
  if (hits.size > 5000) hits.clear();
  return list.length > 5;
}

export async function POST(request: Request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";

  if (rateLimited(ip)) {
    return NextResponse.json(
      { ok: false, error: "Too many applications. Please try again shortly." },
      { status: 429 }
    );
  }

  const body = (await request.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  if (!body) {
    return NextResponse.json(
      { ok: false, error: "Could not read that application." },
      { status: 400 }
    );
  }

  // Honeypot — bots fill hidden fields, people don't.
  if (typeof body.company === "string" && body.company.trim() !== "") {
    return NextResponse.json({ ok: true });
  }

  const name = String(body.name ?? "").trim();
  const email = String(body.email ?? "").trim();
  const phone = String(body.phone ?? "").trim();
  const note = String(body.note ?? "").trim();

  if (!name || name.length > MAX.name) {
    return NextResponse.json(
      { ok: false, error: "Please give us your name." },
      { status: 400 }
    );
  }
  if (!email || email.length > MAX.email || !EMAIL_RE.test(email)) {
    return NextResponse.json(
      { ok: false, error: "That email address doesn't look right." },
      { status: 400 }
    );
  }
  if (!phone || phone.length > MAX.phone) {
    return NextResponse.json(
      { ok: false, error: "We need a phone number — we'll call you." },
      { status: 400 }
    );
  }
  if (note.length > MAX.note) {
    return NextResponse.json(
      { ok: false, error: "That message is a little long." },
      { status: 400 }
    );
  }

  const role = ROLES[String(body.role)] ? String(body.role) : "either";
  const training = YESNO[String(body.training)] ? String(body.training) : "no";
  const season = YESNO[String(body.season)] ? String(body.season) : "no";
  const contractor = YESNO[String(body.contractor)]
    ? String(body.contractor)
    : "no";
  const experience = EXPERIENCE[String(body.experience)]
    ? String(body.experience)
    : "none";
  const ptin = PTIN[String(body.ptin)] ? String(body.ptin) : "unsure";

  // The three that decide whether this is worth a phone call.
  const qualified = training === "yes" && season === "yes" && contractor === "yes";

  const [firstName, ...rest] = name.split(/\s+/).filter(Boolean);
  const utm = readAttribution(body.attribution);

  const summary = [
    `Role wanted:     ${ROLES[role]}`,
    `Available Oct 1: ${YESNO[training]}`,
    `Available Jan–Apr: ${YESNO[season]}`,
    `OK with 1099:    ${YESNO[contractor]}`,
    `Experience:      ${EXPERIENCE[experience]}`,
    `PTIN:            ${PTIN[ptin]}`,
    `Screen:          ${qualified ? "QUALIFIED — call today" : "Does not meet basics"}`,
    utm?.utm_campaign ? `Campaign:        ${utm.utm_campaign}` : "",
    "",
    note ? `Their note:\n${note}` : "(no note)",
  ]
    .filter(Boolean)
    .join("\n");

  const received = new Date().toISOString();

  // Flat payload for the recruitment sheet. Keys map straight to columns, so
  // a Zapier "Catch Hook" or a Google Apps Script doPost can drop it in a row
  // without anyone writing a mapping.
  const row = {
    received,
    source: "careers-page",
    name,
    email,
    phone,
    role: ROLES[role],
    available_oct_1: YESNO[training],
    available_season: YESNO[season],
    ok_1099: YESNO[contractor],
    experience: EXPERIENCE[experience],
    ptin: PTIN[ptin],
    screen: qualified ? "QUALIFIED" : "Does not meet basics",
    campaign: utm?.utm_campaign ?? "",
    note,
  };

  // Store first. A back-office problem must never tell an applicant their
  // application failed.
  try {
    await saveContactSubmission({
      firstName: firstName ?? name,
      lastName: rest.join(" ") || null,
      email,
      phone,
      department: "application",
      message: summary,
      routedTo: site.email,
      ip,
      userAgent: request.headers.get("user-agent"),
    });
  } catch (err) {
    console.error("[apply] storage failed:", err);
  }

  // Alert the office, push to the recruitment sheet, and acknowledge to the
  // applicant. Awaited but bounded — serverless abandons un-awaited promises
  // the moment the handler returns.
  await settleWithin(4000, [
    postToSheet(row),
    notifyNewLead({
      kind: "application",
      name,
      email,
      phone,
      topic: ROLES[role],
      message: summary,
      page: "/careers",
      utm,
      brand: "SmartTaxIQ · Recruitment",
      extra: {
        Screen: qualified ? "QUALIFIED" : "Does not meet basics",
        Experience: EXPERIENCE[experience],
      },
    }),
    mailerConfigured()
      ? deliver({
          to: email,
          subject: "We've got your application — Smart Tax IQ",
          html: applicantReply(firstName ?? name).html,
          text: applicantReply(firstName ?? name).text,
          replyTo: site.email,
        }).catch((err) => console.error("[apply] acknowledgement failed:", err))
      : Promise.resolve(null),
  ]);

  return NextResponse.json({ ok: true });
}

/**
 * Push the application to the recruitment sheet.
 *
 * Applications arrive by two routes: the form inside the Meta ad, which Meta
 * collects and an automation copies into a Google Sheet, and this page, which
 * people reach from organic posts, referrals and search. Both need to land in
 * the SAME place or somebody gets called twice and somebody else not at all.
 *
 * So this posts the same flat row to that sheet's webhook. It is deliberately
 * independent of the database: recruitment runs for twelve days and the person
 * doing the calling needs a list she can sort and tick, not a Postgres table.
 * If the webhook is not configured, nothing breaks — the alert still fires and
 * Supabase still has the record.
 */
async function postToSheet(row: Record<string, string>) {
  const url = process.env.RECRUITMENT_WEBHOOK_URL;
  if (!url) return null;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(row),
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) {
      console.error("[apply] sheet webhook returned", res.status);
    }
    return null;
  } catch (err) {
    console.error("[apply] sheet webhook failed:", err);
    return null;
  }
}

/** Acknowledgement to the applicant. Sets the expectation and the timeline. */
function applicantReply(firstName: string) {
  const text = `${firstName},

Thanks for applying to train as a tax preparer with Smart Tax IQ.

We read every application. If it looks like a fit, someone will call you within one business day — it'll be a Detroit number, so keep an eye out.

A reminder of the three things that matter:
  1. Training runs 10 weeks from October 1
  2. You must pass the final exam in December to work the season
  3. The season runs January to April

Questions in the meantime? Call ${site.phone}.

${site.preparer.name}
${site.divisionStatement}`;

  const html = `<!doctype html><html><body style="margin:0;padding:24px;background:#eef1f6">
  <div style="max-width:540px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden">
    <div style="padding:20px 26px;background:#081840">
      <p style="margin:0;font-family:Helvetica,Arial,sans-serif;font-size:19px;font-weight:700;color:#fff">
        Smart<span style="color:#d8b038">TaxIQ</span>
      </p>
    </div>
    <div style="padding:26px;font-family:Helvetica,Arial,sans-serif;font-size:16px;line-height:1.7;color:#081840">
      <p style="margin:0 0 16px">${escapeHtml(firstName)},</p>
      <p style="margin:0 0 16px">Thanks for applying to train as a tax preparer with Smart Tax IQ.</p>
      <p style="margin:0 0 16px">We read every application. If it looks like a fit, someone will call you within one business day &mdash; it'll be a Detroit number, so keep an eye out.</p>
      <p style="margin:0 0 8px"><strong>A reminder of the three things that matter:</strong></p>
      <ol style="margin:0 0 16px;padding-left:20px">
        <li>Training runs 10 weeks from October 1</li>
        <li>You must pass the final exam in December to work the season</li>
        <li>The season runs January to April</li>
      </ol>
      <p style="margin:0 0 16px">Questions in the meantime? Call
        <a href="tel:${site.phone.replace(/\D/g, "")}" style="color:#9a7020">${site.phone}</a>.</p>
      <p style="margin:24px 0 0">${escapeHtml(site.preparer.name)}</p>
      <p style="margin:22px 0 0;padding-top:16px;border-top:1px solid #e6eaf1;font-size:12.5px;color:#5b6577">
        ${escapeHtml(site.divisionStatement)}
      </p>
    </div>
  </div>
</body></html>`;

  return { html, text };
}

function escapeHtml(v: string) {
  return v
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
