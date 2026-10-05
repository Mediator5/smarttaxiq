import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  academyConfigured,
  findByIntakeToken,
  getSetting,
} from "@/lib/academy/store";
import { site } from "@/lib/site";
import IntakeForm from "@/components/academy/IntakeForm";

/**
 * The preparer's own onboarding page.
 *
 * No account and no password: the token in the URL is the credential, the way
 * a W-9 request from a filing service works. That is proportionate here for
 * one reason and one reason only — nothing on this page is sensitive. It asks
 * for a PTIN, which is a public credential number, and a typed signature on a
 * document the person has read. If it ever asked for anything more, a bearer
 * link would stop being enough and this would need real accounts.
 *
 * It deliberately does not ask for, and cannot accept, a Social Security
 * number, a date of birth, a bank detail or a file. The page says so out loud,
 * because an unexpected email asking a tax preparer for their credentials is
 * shaped exactly like a phishing attempt, and the honest version has to work
 * harder than the dishonest one to look legitimate.
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
          <Done person={person} />
        ) : person.expired ? (
          <Expired />
        ) : (
          <>
            <p className="lede mt-5">
              Before the season starts we need your PTIN and your signature on
              our security plan. It takes about two minutes.
            </p>

            <div className="mt-8 rounded-2xl border border-ink/10 bg-ice p-6">
              <h2 className="text-[16px] font-bold">
                What this page will never ask you for
              </h2>
              <p className="mt-3 text-[15px] leading-relaxed text-ink/70">
                Your Social Security number, your date of birth, your bank
                details, a password, or a photograph of any document. There is
                no upload button on this page and there is not going to be one.
              </p>
              <p className="mt-3 text-[15px] leading-relaxed text-ink/70">
                Your W-9 comes separately, as its own request from our filing
                service. That is the only place your Social Security number
                should ever be typed. If any page claiming to be ours asks for
                one of the things above, close it and call{" "}
                <a href={`tel:${site.phone.replace(/[^\d+]/g, "")}`} className="font-semibold text-ink underline underline-offset-2">
                  {site.phone}
                </a>
                .
              </p>
            </div>

            <IntakeForm
              token={params.token}
              firstName={person.first_name}
              fullName={`${person.first_name} ${person.last_name ?? ""}`.trim()}
              email={person.email}
              ptin={person.ptin}
              planUrl={planUrl}
            />
          </>
        )}
      </div>
    </section>
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
}: {
  person: { plan_signed_name: string | null; ptin: string | null };
}) {
  return (
    <div className="mt-6">
      <p className="lede">
        We have everything we need from this page. Nothing further is required
        of you here.
      </p>

      <dl className="mt-8 divide-y divide-ink/10 rounded-2xl border border-ink/10 bg-white">
        <div className="flex flex-wrap items-baseline justify-between gap-2 px-6 py-4">
          <dt className="text-[11.5px] font-bold uppercase tracking-[0.16em] text-ink/55">
            PTIN recorded
          </dt>
          <dd className="font-mono text-[15.5px] text-ink">
            {person.ptin ?? "—"}
          </dd>
        </div>
        <div className="flex flex-wrap items-baseline justify-between gap-2 px-6 py-4">
          <dt className="text-[11.5px] font-bold uppercase tracking-[0.16em] text-ink/55">
            Security plan signed by
          </dt>
          <dd className="text-[15.5px] text-ink">
            {person.plan_signed_name ?? "—"}
          </dd>
        </div>
      </dl>

      <p className="mt-6 text-[15px] leading-relaxed text-ink/65">
        Your W-9 is handled separately. If you have not had that request yet,
        it is still coming — it arrives from our filing service, not from this
        page.
      </p>
    </div>
  );
}
