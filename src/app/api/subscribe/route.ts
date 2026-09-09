import { NextResponse } from "next/server";
import { captureLead, readAttribution } from "@/lib/leads";

export const dynamic = "force-dynamic";

/**
 * Email capture.
 *
 * The offer on this site is deadline reminders and tax tips rather than a
 * download, so there is nothing to gate and nothing to hand back — the value
 * arrives later, in the inbox. That makes the form itself as low-friction as
 * it can be: one field, one button.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

/** Whitelisted so the source column cannot be filled with arbitrary text by
 *  anyone posting to this endpoint directly. */
const SOURCES = [
  "deadlines",
  "footer",
  "home",
  "resources",
  "pricing",
  "services",
  "process",
  "faq",
  "about",
  "start",
  "contact",
  "article",
];

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

export async function POST(request: Request) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
    if (rateLimited(ip)) {
      return NextResponse.json(
        { ok: false, error: "Too many requests. Please try again shortly." },
        { status: 429 }
      );
    }

    const body = (await request.json().catch(() => null)) as Record<
      string,
      unknown
    > | null;
    if (!body) {
      return NextResponse.json(
        { ok: false, error: "Invalid request." },
        { status: 400 }
      );
    }

    // Honeypot — bots fill hidden fields, people don't. Report success so
    // they don't learn they were caught and come back with a better guess.
    if (body.website) return NextResponse.json({ ok: true });

    // Trim before validating: pasted addresses very often carry a trailing
    // space, and rejecting those just looks like a broken form.
    const email = String(body.email ?? "").trim();
    if (!email || !EMAIL_RE.test(email)) {
      return NextResponse.json(
        { ok: false, error: "That email address doesn't look right." },
        { status: 400 }
      );
    }

    const firstName = String(body.firstName ?? "").trim();
    const source = SOURCES.includes(String(body.source))
      ? String(body.source)
      : "deadlines";

    const result = await captureLead({
      kind: source === "deadlines" ? "newsletter" : "checklist",
      email,
      firstName: firstName || undefined,
      source,
      page: typeof body.page === "string" ? body.page : undefined,
      utm: readAttribution(body.attribution),
      subscribe: true,
    });

    // Only a total failure — nothing stored AND nothing synced — is worth
    // showing the visitor, because only then is there genuinely no record.
    if (!result.ok && result.audience !== "synced") {
      return NextResponse.json(
        {
          ok: false,
          error: "We couldn't save that just now. Please try again.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[subscribe] error:", err);
    return NextResponse.json(
      { ok: false, error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
