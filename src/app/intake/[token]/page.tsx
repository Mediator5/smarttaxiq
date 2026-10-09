import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  academyConfigured,
  findByIntakeToken,
  getSetting,
  listFilesFor,
  type OnboardingFile,
} from "@/lib/academy/store";
import { site } from "@/lib/site";
import IntakeForm from "@/components/academy/IntakeForm";
import IntakeUploads from "@/components/academy/IntakeUploads";

/**
 * The preparer's own onboarding page.
 *
 * No account and no password: the token in the URL is the credential, the way
 * a W-9 request from a filing service works. The token is 256 bits, stored
 * only as a hash, dies after three weeks, and is retired the moment a new one
 * is issued.
 *
 * As of October 2026 this page takes documents — a W-9 and a photo ID among
 * them — at the practice's request. That raised the stakes of the bearer link
 * considerably, so note what still holds: the link can WRITE files and can
 * READ nothing. There is no endpoint that will hand a document back, not even
 * to the person who uploaded it; the list below their upload is metadata the
 * page already knew. Somebody who intercepts a link can post a junk PDF into
 * one preparer's record. They cannot retrieve that preparer's licence.
 *
 * An unexpected email asking a tax preparer to upload their W-9 is shaped
 * exactly like a phishing attempt, which it should be, because most of them
 * are. The honest version therefore has to work harder than the dishonest one
 * to look legitimate: hence the panel telling them what we will never ask for
 * and a phone number to check on.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Preparer onboarding",
  robots: { index: false, follow: false, nocache: true },
};

export default async function IntakePage({
  params,
}: {
  params: { token: string };
}) {
  if (!academyConfigured()) notFound();

  const person = await findByIntakeToken(params.token);
  // A token that does not exist and a token belonging to somebody archived get
  // the same answer as any other unknown URL. Nothing here says whether a link
  // was ever real.
  if (!person) notFound();

  const planUrl = await getSetting("security_plan_url");
  const files = await listFilesFor(person.id);

  return (
    <section className="py-14 sm:py-20">
      <div className="shell max-w-[680px]">
        <span className="eyebrow">{site.name} · preparer onboarding</span>
        <h1 className="mt-3 text-[clamp(28px,4.8vw,40px)] leading-[1.08]">
          {person.intake_completed_at
            ? "You're all set"
            : `Two things, ${person.first_name}`}
        </h1>

        {person.intake_completed_at ? (
          <Done person={person} token={params.token} files={files} />
        ) : person.expired ? (
          <Expired />
        ) : (
          <>
            <p className="lede mt-5">
              Before the season starts we need your PTIN and your signature on
              our security plan. It takes about two minutes.
            </p>

            <Phishing />

            <IntakeForm
              token={params.token}
              firstName={person.first_name}
              fullName={`${person.first_name} ${person.last_name ?? ""}`.trim()}
              email={person.email}
              ptin={person.ptin}
              planUrl={planUrl}
            />

            <IntakeUploads token={params.token} initialFiles={files} />
          </>
        )}
      </div>
    </section>
  );
}

/**
 * The panel that has to out-compete a phishing email.
 *
 * It can no longer say "we will never ask you for a document", because now we
 * do. So it says the things that remain true and are actually diagnostic: we
 * never ask you to TYPE an SSN, never ask for a password, never ask for
 * money, and there is a phone number you can check on. A fake page can copy
 * this text; it cannot answer that phone.
 */
function Phishing() {
  const tel = site.phone.replace(/[^\d+]/g, "");
  return (
    <div className="mt-8 rounded-2xl border border-ink/10 bg-ice p-6">
      <h2 className="text-[16px] font-bold">Before you send anything</h2>
      <p className="mt-3 text-[15px] leading-relaxed text-ink/70">
        This page asks for your W-9 and your photo ID as files, because we need
        them to pay you and to confirm you are you. It will never ask you to
        type a Social Security number into a box, never ask for a password, and
        never ask you for money.
      </p>
      <p className="mt-3 text-[15px] leading-relaxed text-ink/70">
        If anything here feels off &mdash; or if you were not expecting this
        link &mdash; stop and call{" "}
        <a
          href={`tel:${tel}`}
          className="font-semibold text-ink underline underline-offset-2"
        >
          {site.phone}
        </a>{" "}
        before you upload a thing. We would much rather take that call.
      </p>
    </div>
  );
}

function Expired() {
  return (
    <div className="mt-8 rounded-2xl border border-[#e8c9bf] bg-[#fbeeea] p-6">
      <h2 className="text-[17px] font-bold text-[#a8341c]">
        This link has expired
      </h2>
      <p className="mt-3 text-[15.5px] leading-relaxed text-ink/75">
        Onboarding links stop working after three weeks, which is a security
        measure rather than anything you have done wrong. Call{" "}
        <a href={`tel:${site.phone.replace(/[^\d+]/g, "")}`} className="font-semibold underline underline-offset-2">
          {site.phone}
        </a>{" "}
        or reply to the email it came in, and a fresh one will be sent.
      </p>
    </div>
  );
}

function Done({
  person,
  token,
  files,
}: {
  person: { plan_signed_name: string | null; ptin: string | null };
  token: string;
  files: OnboardingFile[];
}) {
  const missing = [
    files.some((f) => f.kind === "w9") ? null : "your W-9",
    files.some((f) => f.kind === "id") ? null : "your photo ID",
  ].filter(Boolean) as string[];

  return (
    <div className="mt-6">
      <p className="lede">
        {missing.length
          ? `Your PTIN and signature are in. We still need ${missing.join(" and ")}.`
          : "We have everything we need from you. Nothing further is required here."}
      </p>

      <dl className="mt-8 divide-y divide-ink/10 rounded-2xl border border-ink/10 bg-white">
        <div className="flex flex-wrap items-baseline justify-between gap-2 px-6 py-4">
          <dt className="text-[11.5px] font-bold uppercase tracking-[0.16em] text-ink/55">
            PTIN recorded
          </dt>
          <dd className="font-mono text-[15.5px] text-ink">
            {person.ptin ?? "\u2014"}
          </dd>
        </div>
        <div className="flex flex-wrap items-baseline justify-between gap-2 px-6 py-4">
          <dt className="text-[11.5px] font-bold uppercase tracking-[0.16em] text-ink/55">
            Security plan signed by
          </dt>
          <dd className="text-[15.5px] text-ink">
            {person.plan_signed_name ?? "\u2014"}
          </dd>
        </div>
      </dl>

      {/* The link stays useful after submitting. Most people send the two
          quick fields immediately and go hunting for their W-9 afterwards. */}
      <IntakeUploads token={token} initialFiles={files} />
    </div>
  );
}
