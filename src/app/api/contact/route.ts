import { NextResponse } from "next/server";

/**
 * Contact form endpoint.
 *
 * Right now this validates the submission and logs it, which means nothing is
 * lost but nothing is delivered either. To actually deliver mail, uncomment
 * the block at the bottom and set the environment variables — any SMTP
 * provider or transactional API works.
 */

const TOPIC_INBOX: Record<string, string> = {
  "new-return": "info@smarttaxiq.com",
  "existing-client": "info@smarttaxiq.com",
  notice: "info@smarttaxiq.com",
  business: "info@smarttaxiq.com",
  other: "info@smarttaxiq.com",
};

const MAX = { name: 120, email: 200, phone: 40, message: 4000 };

export async function POST(request: Request) {
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

  // Never log the message body — it routinely contains tax details.
  console.log(
    `[contact] ${new Date().toISOString()} topic=${topic} route=${inbox} from=${email}`
  );

  /*
  // ---- To deliver by email, install nodemailer and uncomment ----
  //   npm install nodemailer
  //
  // import nodemailer from "nodemailer";
  //
  // const transport = nodemailer.createTransport({
  //   host: process.env.SMTP_HOST,
  //   port: Number(process.env.SMTP_PORT ?? 587),
  //   auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  // });
  //
  // await transport.sendMail({
  //   from: process.env.MAIL_FROM,
  //   to: inbox,
  //   replyTo: email,
  //   subject: `Website enquiry — ${topic} — ${name}`,
  //   text: `${name}\n${email}\n${phone}\n\n${message}`,
  // });
  */

  return NextResponse.json({ ok: true });
}
