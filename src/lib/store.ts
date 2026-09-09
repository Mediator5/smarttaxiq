import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import crypto from "crypto";

/**
 * Lead storage — optional, and pointed at the same Supabase project the
 * Carter Cole site uses.
 *
 * The two websites stay separate codebases, but a lead is a lead: the office
 * should be able to open one dashboard and see everyone who has raised a hand
 * across both brands, rather than checking two places and the mailing list. Sharing
 * the database is what makes that possible without either project importing
 * the other — they meet at the data, not in the code.
 *
 * Entirely env-gated. With no SUPABASE_URL set, this site behaves exactly as
 * it did before: nothing is stored, and leads still reach the mailing list and the
 * alert channels. Storage is an upgrade, not a dependency.
 */

let client: SupabaseClient | null = null;

export function storageConfigured() {
  return Boolean(
    process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

function db() {
  if (!storageConfigured()) return null;
  if (!client) {
    client = createClient(
      process.env.SUPABASE_URL!,
      // The service-role key bypasses Row Level Security, which is enabled
      // with no policies — so the public keys can read nothing at all and
      // only the server can touch the list. Never expose this key.
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );
  }
  return client;
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

/**
 * Insert or update a subscriber. Matches the `subscribers` table the Carter
 * Cole site created, so rows from both sites sit in one list and the existing
 * admin dashboard shows them without modification. The `source` column is
 * what distinguishes them.
 */
export async function upsertSubscriber(input: {
  email: string;
  firstName: string;
  lastName?: string;
  source: string;
}): Promise<{ token: string; isNew: boolean } | null> {
  const supabase = db();
  if (!supabase) return null;

  const email = normalizeEmail(input.email);

  const { data: existing } = await supabase
    .from("subscribers")
    .select("id, token")
    .eq("email", email)
    .maybeSingle();

  if (existing?.token) {
    await supabase
      .from("subscribers")
      .update({
        first_name: input.firstName,
        ...(input.lastName ? { last_name: input.lastName } : {}),
      })
      .eq("id", existing.id);
    return { token: existing.token as string, isNew: false };
  }

  const token = crypto.randomBytes(24).toString("hex");
  const { error } = await supabase.from("subscribers").insert({
    email,
    first_name: input.firstName,
    last_name: input.lastName ?? null,
    token,
    source: input.source,
    status: "active",
  });

  if (error) throw new Error(error.message);
  return { token, isNew: true };
}

/** Contact-form submissions, so a message is never only an email that bounced. */
export async function saveContactSubmission(input: {
  firstName: string;
  lastName?: string | null;
  email: string;
  phone?: string | null;
  department: string;
  message: string;
  routedTo: string;
  ip?: string | null;
  userAgent?: string | null;
}) {
  const supabase = db();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("contact_submissions")
    .insert({
      first_name: input.firstName,
      last_name: input.lastName ?? null,
      email: normalizeEmail(input.email),
      phone: input.phone ?? null,
      department: input.department,
      message: input.message,
      routed_to: input.routedTo,
      ip: input.ip ?? null,
      user_agent: input.userAgent ?? null,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return data;
}
