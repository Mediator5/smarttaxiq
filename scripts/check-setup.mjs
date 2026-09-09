/**
 * Pre-flight check. Run with:  npm run check
 *
 * Verifies, without sending anything or writing anything, that every
 * credential you have pasted in actually works. Run it after filling in
 * .env.local and before going looking for bugs — it catches the difference
 * between "not configured" (fine, the site still runs) and "configured but
 * wrong", which looks like it is working right up until a lead goes missing.
 */
import fs from "fs";
import path from "path";

const GREEN = "\x1b[32m", RED = "\x1b[31m", YEL = "\x1b[33m", DIM = "\x1b[2m", OFF = "\x1b[0m";
const ok = (m) => console.log(`  ${GREEN}PASS${OFF}  ${m}`);
const bad = (m, hint) => { console.log(`  ${RED}FAIL${OFF}  ${m}`); if (hint) console.log(`        ${DIM}${hint}${OFF}`); failures++; };
const warn = (m, hint) => { console.log(`  ${YEL}WARN${OFF}  ${m}`); if (hint) console.log(`        ${DIM}${hint}${OFF}`); };

let failures = 0;

const envPath = path.join(process.cwd(), ".env.local");
if (!fs.existsSync(envPath)) {
  console.error(`${RED}No .env.local found. Copy .env.example to .env.local first.${OFF}`);
  process.exit(1);
}
const env = Object.fromEntries(
  fs.readFileSync(envPath, "utf8").split(/\r?\n/)
    .filter((l) => l.trim() && !l.trim().startsWith("#") && l.includes("="))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, "")]; })
);

// ---- Mailing list ---------------------------------------------------------
console.log("\nMailing list");
const mcKey = env.MAILCHIMP_API_KEY;
const mcList = env.MAILCHIMP_AUDIENCE_ID;

if (!mcKey && !mcList) {
  warn("Mailchimp not configured",
       "Leads still alert you and still reach storage if it is set up. Use the SAME key and audience ID as the Carter Cole site.");
} else if (!mcKey || !mcList) {
  bad(`Mailchimp is half configured — ${mcKey ? "MAILCHIMP_AUDIENCE_ID" : "MAILCHIMP_API_KEY"} is missing`,
      "Both are needed. Audience ID: Audience -> More options -> Audience settings -> Audience ID.");
} else {
  const prefix = (env.MAILCHIMP_SERVER_PREFIX || mcKey.split("-")[1] || "").trim();
  if (!prefix) {
    bad("Could not work out your Mailchimp data centre from the API key",
        'The key should end in something like "-us21". Copy the whole key including that suffix.');
  } else {
    const auth = "Basic " + Buffer.from(`anystring:${mcKey}`).toString("base64");
    const base = `https://${prefix}.api.mailchimp.com/3.0`;
    try {
      const res = await fetch(`${base}/lists/${mcList}`, { headers: { Authorization: auth } });
      if (res.status === 401) bad("Mailchimp rejected the API key (401)", "Create a fresh key under Account -> Extras -> API keys.");
      else if (res.status === 404) bad(`Mailchimp has no audience with ID "${mcList}" (404)`, "It is about 10 characters, not the audience name.");
      else if (!res.ok) bad(`Mailchimp returned HTTP ${res.status}`, `Data centre used: ${prefix}`);
      else {
        const list = await res.json();
        ok(`Mailchimp audience "${list.name}" (${list.stats?.member_count ?? 0} contacts, data centre ${prefix})`);
        console.log(`        ${DIM}Confirm this is the same audience the Carter Cole site points at.${OFF}`);
        // Audience fields ("merge fields"). These are the columns of the
        // contact list. Email, First Name and Last Name exist in every
        // audience; PHONE is present but hidden by default; SOURCE never
        // exists until someone creates it.
        const mf = await fetch(`${base}/lists/${mcList}/merge-fields`, { headers: { Authorization: auth } });
        if (mf.ok) {
          const fields = (await mf.json()).merge_fields || [];
          const tags = fields.map((f) => f.tag);
          for (const t of ["PHONE", "SOURCE"]) {
            if (tags.includes(t)) ok(`Audience field ${t} exists`);
            else warn(`Audience field ${t} does not exist — that value will be dropped on the way in`,
                      `Audience -> three-dot menu -> "Audience fields and *|MERGE|* tags" -> Create a new field, merge tag ${t}.`);
          }
          const required = fields.filter((f) => f.required).map((f) => f.tag);
          if (required.length) {
            warn(`Audience fields marked required: ${required.join(", ")}`,
                 "The site sends skip_merge_validation so signups are not rejected for missing them, but consider un-requiring them — the capture forms deliberately ask for very little.");
          }
        }
      }
    } catch (e) {
      bad(`Could not reach Mailchimp — ${e.message}`, "Network problem, or the data centre in the key is wrong.");
    }
  }
}

if (env.RESEND_AUDIENCE_ID && mcKey && mcList) {
  warn("Both Mailchimp and RESEND_AUDIENCE_ID are set — Mailchimp wins",
       "Clear one of them so it is obvious which list is live.");
}

// ---- Email delivery -------------------------------------------------------
console.log("\nEmail delivery");
if (!env.RESEND_API_KEY) {
  bad("RESEND_API_KEY is empty — this site cannot send anything",
      "Contact-form acknowledgements and lead alerts both need it. resend.com -> API keys.");
} else {
  try {
    const res = await fetch("https://api.resend.com/domains", {
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}` },
    });
    if (res.status === 401) bad("Resend rejected the API key (401)", "Create a fresh key at resend.com -> API keys.");
    else if (!res.ok) warn(`Resend returned HTTP ${res.status}`, "The key may be restricted to sending only, which is fine.");
    else {
      const body = await res.json();
      const domains = (body.data || []).map((d) => `${d.name} (${d.status})`);
      ok(`Resend key works${domains.length ? ` — domains: ${domains.join(", ")}` : ""}`);
      const from = (env.MAIL_FROM || "").match(/<?([^<>\s]+@[^<>\s]+)>?$/)?.[1];
      if (from) {
        const host = from.split("@")[1];
        const verified = (body.data || []).some((d) => d.name === host && d.status === "verified");
        if (verified) ok(`MAIL_FROM domain ${host} is verified`);
        else warn(`MAIL_FROM domain ${host} is not verified in Resend`,
                  "Mail will be rejected until you add and verify the domain, including its SPF and DKIM records.");
      }
    }
  } catch (e) {
    bad(`Could not reach Resend — ${e.message}`);
  }
}
if (!env.MAIL_FROM) warn("MAIL_FROM is empty", "Falling back to no-reply@ on the site domain, which must still be verified in Resend.");

// ---- Lead storage (optional) ---------------------------------------------
console.log("\nLead storage");
if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
  warn("Supabase not configured — this site stores nothing",
       "Optional. Point it at the SAME project as the Carter Cole site and every lead from both brands lands in one dashboard.");
} else {
  try {
    const res = await fetch(`${env.SUPABASE_URL}/rest/v1/subscribers?select=email&limit=1`, {
      headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` },
    });
    if (res.ok) ok("Supabase reachable and the subscribers table exists");
    else bad(`Supabase returned HTTP ${res.status}`,
             res.status === 401 ? "Use the service_role secret, not the anon key — row level security blocks anon entirely."
                                : "Run supabase/schema.sql from the Carter Cole project in the SQL Editor.");
  } catch (e) {
    bad(`Could not reach Supabase — ${e.message}`);
  }
}

// ---- Alerts, scheduling, analytics ---------------------------------------
console.log("\nAlerts and tracking");
if (env.LEAD_NOTIFY_EMAIL) ok(`Lead alerts go to ${env.LEAD_NOTIFY_EMAIL}`);
else warn("LEAD_NOTIFY_EMAIL is empty", "Set it explicitly so you know where alerts land.");

const twilio = ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_FROM_NUMBER", "LEAD_NOTIFY_SMS"];
const set = twilio.filter((k) => env[k]);
if (set.length === 0) warn("Text alerts are off", "Email alerts still fire.");
else if (set.length < twilio.length) bad(`Twilio is half configured — missing ${twilio.filter((k) => !env[k]).join(", ")}`, "All four are needed or no text is sent.");
else {
  const badNums = [env.TWILIO_FROM_NUMBER, ...env.LEAD_NOTIFY_SMS.split(",")]
    .map((n) => n.trim()).filter((n) => n && !/^\+[1-9]\d{6,14}$/.test(n));
  if (badNums.length) bad(`Phone number not in E.164 format: ${badNums.join(", ")}`, "Twilio needs +1 then ten digits. E.g. +13135550100");
  else ok(`Text alerts to ${env.LEAD_NOTIFY_SMS}`);
}

const cal = env.NEXT_PUBLIC_CALENDLY_URL;
if (!cal) ok("Calendly using the built-in default (calendly.com/lashandasmarttaxiq/30min)");
else if (!/^https:\/\/calendly\.com\/.+/.test(cal)) bad(`NEXT_PUBLIC_CALENDLY_URL doesn't look like a Calendly link: ${cal}`, "Expected https://calendly.com/your-name/30min");
else ok(`Calendly override set: ${cal}`);

const ga = env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
if (!ga) warn("Google Analytics is not installed", "Do this before spending on ads — traffic history cannot be backfilled.");
else if (!/^G-[A-Z0-9]+$/i.test(ga)) bad(`NEXT_PUBLIC_GA_MEASUREMENT_ID looks wrong: ${ga}`, 'GA4 IDs start with "G-". "UA-" is retired and "AW-" is Google Ads.');
else ok(`Google Analytics ${ga}`);
if (ga && ga === "G-XXXXXXXXXX") bad("GA measurement ID is still the placeholder");

for (const k of ["JOTFORM_WEBHOOK_SECRET", "CALENDLY_WEBHOOK_SECRET"]) {
  if (!env[k]) warn(`${k} is empty — that webhook accepts anything that finds the URL`, "Set a long random string and put it in the webhook URL as ?key=...");
  else if (env[k].length < 16) warn(`${k} is short (${env[k].length} characters)`, "Use something long enough not to be guessed.");
  else ok(k);
}

console.log(
  failures === 0
    ? `\n${GREEN}Everything checks out.${OFF} Run npm run dev and submit a test form.\n`
    : `\n${RED}${failures} check(s) failed.${OFF} Fix the items above, then run npm run check again.\n`
);
process.exit(failures === 0 ? 0 : 1);
