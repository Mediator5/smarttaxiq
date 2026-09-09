import { NextResponse } from "next/server";
import { captureLead, readAttribution } from "@/lib/leads";
import { saveContactSubmission } from "@/lib/store";
import { autoReply, deliver, mailerConfigured } from "@/lib/mailer";

export const dynamic = "force-dynamic";

/**
 * Contact form endpoint.
 *
 * This used to validate a submission, log a line, and throw it away — anyone
 * who used the form left no record anywhere. It now does four things in
 * order of how badly each one would be missed: stores the message, alerts the
 * office by email and SMS, sends the visitor an acknowledgement, and adds
 * them to the mailing list if they asked to be.
 *
 * Every one of those is individually optional and individually guarded. With
 * no credentials configured the endpoint behaves as it always did and the
 * visitor still gets a success response — but nothing is silently lost, which
 * was the actual problem.
 */

const TOPIC_LABEL: Record<string, string> = {
  "new-return": "New tax return",
  "existing-client": "Existing client",
  notice: "IRS notice or letter",
  business: "Business taxes",
  other: "General enquiry",
};

// Small in-memory rate limit: 5 submissions per IP per 10 minutes.
const hits = new Map<string, number[]>();
function rateLimited(ip: string) {
  const now = Date.now();
  const win = 10 * 60 * 1000;
  const list = (hits.get(ip) || []).filter((t) => now - t < win);
  list.push(now);
  hits.set(ip, list);
  if (hits.size > 5000) hits.clear();
  return list.length > 5;
}

const TOPIC_INBOX: Record<string, string> = {
  "new-return": "info@smarttaxiq.com",
  "existing-client": "info@smarttaxiq.com",
  notice: "info@smarttaxiq.com",
  business: "info@smarttaxiq.com",
  other: "info@smarttaxiq.com",
};

const MAX = { name: 120, email: 200, phone: 40, message: 4000 };

export async function POST(request: Request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";

  if (rateLimited(ip)) {
    return NextResponse.json(
      { ok: false, error: "Too many messages. Please try again shortly." },
      { status: 429 }
    );
  }

  let payload: Record<string, unknown>;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Could not read that submission." },
      { status: 400 }
    );
  }

  // Honeypot — real people never fill this in.
  if (typeof payload.company === "string" && payload.company.trim() !== "") {
    return NextResponse.json({ ok: true });
  }

  const name = String(payload.name ?? "").trim();
  const email = String(payload.email ?? "").trim();
  const phone = String(payload.phone ?? "").trim();
  const topic = String(payload.topic ?? "other").trim();
  const message = String(payload.message ?? "").trim();

  if (!name || name.length > MAX.name) {
    return NextResponse.json(
      { ok: false, error: "Please give us a name we can use." },
      { status: 400 }
    );
  }

  // Deliberately permissive: one @, something either side, a dot in the
  // domain. Anything stricter rejects addresses that are perfectly valid.
  if (
    !email ||
    email.length > MAX.email ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    return NextResponse.json(
      { ok: false, error: "That email address doesn't look right." },
      { status: 400 }
    );
  }

  if (phone.length > MAX.phone) {
    return NextResponse.json(
      { ok: false, error: "That phone number is too long." },
      { status: 400 }
    );
  }

  if (!message || message.length > MAX.message) {
    return NextResponse.json(
      { ok: false, error: "Please tell us a little about what you need." },
      { status: 400 }
    );
  }

  const inbox = TOPIC_INBOX[topic] ?? TOPIC_INBOX.other;
  const label = TOPIC_LABEL[topic] ?? TOPIC_LABEL.other;
  const [firstName, ...rest] = name.split(/\s+/).filter(Boolean);

  // Never log the message body — it routinely contains tax details.
  console.log(
    `[contact] ${new Date().toISOString()} topic=${topic} route=${inbox} from=${email}`
  );

  // 1. Store it, if storage is configured. Guarded rather than awaited into
  //    the response: a database blip must not tell a visitor their message
  //    failed when the alert below will still reach the office.
  try {
    await saveContactSubmission({
      firstName: firstName ?? name,
      lastName: rest.join(" ") || null,
      email,
      phone: phone || null,
      department: topic,
      message,
      routedTo: inbox,
      ip,
      userAgent: request.headers.get("user-agent"),
    });
  } catch (err) {
    console.error("[contact] storage failed:", err);
  }

  // 2. Alert the office and, if they ticked the box, add them to the list.
  //    A contact form is a service request — subscribing someone who did not
  //    ask is how a sending domain earns complaints and loses deliverability.
  await captureLead({
    kind: "contact",
    email,
    firstName: firstName ?? name,
    lastName: rest.join(" ") || undefined,
    phone: phone || undefined,
    topic: label,
    message,
    source: `contact-${topic}`,
    page: typeof payload.page === "string" ? payload.page : "/contact",
    utm: readAttribution(payload.attribution),
    subscribe: payload.optIn === true,
    extra: { "Routed to": inbox },
  });

  // 3. Acknowledge to the visitor. Failing to send this is not their problem
  //    and must not turn into an error on a form that actually worked.
  if (mailerConfigured()) {
    const body = autoReply(firstName ?? name);
    void deliver({
      to: email,
      subject: "We've got your message — SmartTaxIQ",
      html: body.html,
      text: body.text,
      replyTo: inbox,
    }).catch((err) => console.error("[contact] auto-reply failed:", err));
  }

  return NextResponse.json({ ok: true });
}
