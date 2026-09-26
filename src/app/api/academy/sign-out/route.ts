import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/academy/auth";

export const dynamic = "force-dynamic";

/** Drop the session cookie. There is no server-side session to invalidate —
 *  see the note in src/lib/academy/auth.ts about why the session is a signed
 *  cookie rather than a database row. */
export async function POST() {
  clearSessionCookie();
  return NextResponse.json({ ok: true });
}
