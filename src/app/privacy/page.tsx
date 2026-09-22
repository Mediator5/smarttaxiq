import type { Metadata } from "next";
import { PageHero } from "@/components/Section";
import { addressLine, site } from "@/lib/site";

/**
 * Privacy policy.
 *
 * Added because Meta Instant Forms will not publish without a privacy policy
 * URL — it is a hard gate, and a link that 404s gets the ad rejected. It has
 * to be a real, mobile-friendly web page (not a PDF), and it has to describe
 * the forms this site actually runs, including Meta's role in the ad form.
 *
 * Keep the effective date current when the substance changes.
 */
export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Smart Tax IQ, the tax division of Carter Cole & Associates LLC, collects, uses and protects the information you give us.",
  alternates: { canonical: "/privacy" },
  robots: { index: true, follow: true },
};

const EFFECTIVE = "18 September 2026";

export default function PrivacyPage() {
  return (
    <>
      <PageHero
        eyebrow="Privacy"
        title="What we collect, and what we do with it"
        intro={`In plain language, because you should be able to read this without a lawyer. Effective ${EFFECTIVE}.`}
      />

      <section className="py-16 sm:py-20">
        <div className="shell">
          <div className="prose-tax max-w-2xl space-y-8">

            <div>
              <h2 className="text-[22px]">Who we are</h2>
              <p>
                {site.name} is the tax division of {site.parentLegalName}, a tax
                preparation practice at {addressLine}.
              </p>
              <p>
                If you have a question about your information, or want us to
                change or delete it, contact us at{" "}
                <a href={`mailto:${site.email}`} className="font-semibold text-ink underline underline-offset-2">
                  {site.email}
                </a>{" "}
                or{" "}
                <a href={site.phoneHref} className="font-semibold text-ink underline underline-offset-2">
                  {site.phone}
                </a>
                . A person will answer.
              </p>
            </div>

            <div>
              <h2 className="text-[22px]">What we collect</h2>
              <p>We collect information you give us directly, through one of these:</p>
              <ul className="ml-5 list-disc space-y-2">
                <li>
                  <strong>The contact form</strong> — your name, email, phone
                  number, the topic you chose, and whatever you write in the
                  message.
                </li>
                <li>
                  <strong>The deadline-reminder signup</strong> — your email
                  address, and which page you signed up from.
                </li>
                <li>
                  <strong>The job application form</strong> — your name, email,
                  phone number, your answers about availability and experience,
                  and any note you add.
                </li>
                <li>
                  <strong>Our job adverts on Facebook and Instagram</strong> —
                  if you apply through the form inside the ad, that form is
                  hosted by Meta. Meta collects your answers and passes them to
                  us. Meta&rsquo;s own handling of your data is governed by its
                  privacy policy, not this one.
                </li>
                <li>
                  <strong>Tax intake forms</strong> — hosted by JotForm, and
                  covered by the engagement terms we agree with you as a client.
                </li>
                <li>
                  <strong>Booking a consultation</strong> — through Calendly,
                  which collects your name, email and chosen time.
                </li>
              </ul>
              <p>
                We also record, automatically, which advertising campaign or
                page brought you here, so we know which of our adverts are
                working. That is stored alongside your enquiry.
              </p>
            </div>

            <div>
              <h2 className="text-[22px]">What we use it for</h2>
              <ul className="ml-5 list-disc space-y-2">
                <li>Answering your enquiry, or assessing your application</li>
                <li>Contacting you about it — by email, phone or text</li>
                <li>
                  Sending you tax deadline reminders and tips, <em>only</em> if
                  you asked for them. Applying for a job does not put you on
                  that list.
                </li>
                <li>Preparing your return, if you become a client</li>
                <li>Understanding which of our adverts produce enquiries</li>
              </ul>
              <p>
                We do not sell your information, and we do not share it with
                anyone for their own marketing.
              </p>
            </div>

            <div>
              <h2 className="text-[22px]">Who else sees it</h2>
              <p>
                Only the services we use to run the practice, and only for that
                purpose:
              </p>
              <ul className="ml-5 list-disc space-y-2">
                <li><strong>Meta</strong> — hosts the application form inside our job adverts</li>
                <li><strong>Supabase</strong> — stores enquiries and applications</li>
                <li><strong>Mailchimp</strong> — holds the mailing list, if you joined it</li>
                <li><strong>Resend</strong> — sends our email</li>
                <li><strong>Calendly</strong> — handles consultation bookings</li>
                <li><strong>JotForm</strong> — hosts the tax intake forms</li>
                <li><strong>Google Analytics</strong> — tells us how the site is used, in aggregate</li>
                <li><strong>Twilio</strong> — sends us a text when an enquiry arrives</li>
              </ul>
              <p>
                We may also disclose information where the law requires it.
              </p>
            </div>

            <div>
              <h2 className="text-[22px]">Your rights</h2>
              <p>You can ask us at any time to:</p>
              <ul className="ml-5 list-disc space-y-2">
                <li>Tell you what information we hold about you</li>
                <li>Correct anything that is wrong</li>
                <li>Delete it, unless we are required to keep it</li>
                <li>Stop sending you marketing email</li>
              </ul>
              <p>
                Every marketing email has a one-click unsubscribe link, and
                unsubscribing takes effect immediately. To ask for anything
                else, email{" "}
                <a href={`mailto:${site.email}`} className="font-semibold text-ink underline underline-offset-2">
                  {site.email}
                </a>
                .
              </p>
            </div>

            <div>
              <h2 className="text-[22px]">How long we keep it</h2>
              <ul className="ml-5 list-disc space-y-2">
                <li><strong>Enquiries</strong> — two years, then deleted</li>
                <li><strong>Job applications</strong> — one year after the season closes, unless you ask us to remove them sooner</li>
                <li><strong>Mailing list</strong> — until you unsubscribe</li>
                <li><strong>Client tax records</strong> — as long as tax law requires, which is longer</li>
              </ul>
            </div>

            <div>
              <h2 className="text-[22px]">How we protect it</h2>
              <p>
                Tax information is about as sensitive as personal data gets, and
                we treat it that way. Access is limited to the people who need
                it, our systems are access-controlled, and our preparers sign a
                confidentiality and data-handling agreement before they touch a
                client file. We maintain a written information security plan as
                required of tax professionals.
              </p>
            </div>

            <div>
              <h2 className="text-[22px]">Children</h2>
              <p>
                This site is not intended for children, and we do not knowingly
                collect information from anyone under 18 through it. Children&rsquo;s
                details do appear on tax returns — that information comes from
                the parent or guardian as part of preparing the return, and is
                held under the client records above.
              </p>
            </div>

            <div>
              <h2 className="text-[22px]">Changes</h2>
              <p>
                If we change this policy we will update the effective date at
                the top. Where the change is significant and we hold your email
                address, we will tell you.
              </p>
            </div>

            <div className="rounded-2xl border border-ink/10 bg-ice p-6">
              <p className="text-[14.5px] leading-[1.7] text-ink/70">
                <strong className="text-ink">{site.parentLegalName}</strong>
                <br />
                {addressLine}
                <br />
                {site.phone} · {site.email}
                <br />
                <span className="text-ink/50">Effective {EFFECTIVE}</span>
              </p>
            </div>

          </div>
        </div>
      </section>
    </>
  );
}
