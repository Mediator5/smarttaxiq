import { NextResponse } from "next/server";
import { captureLead } from "@/lib/leads";

export const dynamic = "force-dynamic";

/**
 * Calendly booking webhook.
 *
 * A booking is the highest-intent lead the site produces — someone has picked
 * a time and expects to be spoken to. It should never sit unnoticed in a
 * calendar invite, so it runs through the same pipeline as everything else and
 * fires the same instant alert.
 *
 * Calendly's free plan does not include webhooks. Two ways to get bookings in
 * here regardless:
 *
 *   1. Zapier / Make free tier: Calendly "Invitee Created" → POST to
 *      https://smarttaxiq.com/api/webhooks/calendly?key=SECRET
 *   2. Or upgrade Calendly and point its native webhook at the same URL.
 *
 * Until either is connected, bookings still reach the office by Calendly's own
 * confirmation email — this route only adds the list entry and the SMS.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

type CalendlyPayload = {
  event?: string;
  payload?: {
    email?: string;
    name?: string;
    text_reminder_number?: string;
    questions_and_answers?: { question?: string; answer?: string }[];
    scheduled_event?: {
      name?: string;
      start_time?: string;
      location?: { location?: string; type?: string };
    };
    tracking?: Record<string, string>;
  };
};

export async function POST(request: Request) {
  const url = new URL(request.url);
  const secret = process.env.CALENDLY_WEBHOOK_SECRET;
  if (secret && url.searchParams.get("key") !== secret) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  let body: CalendlyPayload;
  try {
    body = (await request.json()) as CalendlyPayload;
  } catch {
    return NextResponse.json({ ok: true, parsed: false });
  }

  // Only act on a new booking. Cancellations come through the same URL and
  // should not create a lead.
  if (body.event && !body.event.includes("invitee.created")) {
    return NextResponse.json({ ok: true, ignored: body.event });
  }

  const p = body.payload ?? {};
  const email = (p.email ?? "").trim().toLowerCase();
  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ ok: true, parsed: false });
  }

  const [firstName, ...rest] = (p.name ?? "").split(/\s+/).filter(Boolean);
  const start = p.scheduled_event?.start_time;

  const answers = (p.questions_and_answers ?? [])
    .filter((qa) => qa.answer?.trim())
    .map((qa) => `${qa.question}: ${qa.answer}`)
    .join("\n");

  try {
    await captureLead({
      kind: "booking",
      email,
      firstName: firstName || "New",
      lastName: rest.join(" ") || undefined,
      phone: p.text_reminder_number,
      topic: p.scheduled_event?.name ?? "Consultation",
      message: answers || undefined,
      source: "calendly",
      page: "/contact",
      // Calendly passes through UTM parameters when the embed is given them,
      // so a booking from a paid click stays attributable to its campaign.
      utm: p.tracking,
      extra: {
        "Scheduled for": start
          ? new Date(start).toLocaleString("en-US", {
              timeZone: "America/New_York",
              dateStyle: "full",
              timeStyle: "short",
            }) + " ET"
          : undefined,
        Location: p.scheduled_event?.location?.location,
      },
    });
  } catch (err) {
    console.error("[calendly] capture failed:", err);
  }

  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({ ok: true, endpoint: "calendly-webhook" });
}
