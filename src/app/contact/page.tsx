import type { Metadata } from "next";
import Link from "next/link";
import ContactForm from "@/components/ContactForm";
import CalendlyEmbed from "@/components/CalendlyEmbed";
import GoogleReviews from "@/components/GoogleReviews";
import Reveal from "@/components/Reveal";
import { PageHero } from "@/components/Section";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Call, email or send a message. Based in Detroit, filing for clients in all 50 states. Every enquiry answered within one business day.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <>
      <PageHero
        eyebrow="Contact"
        title="Talk to a person about your actual situation"
        intro="No phone tree, no ticket number. Tell us what's going on and we'll tell you what applies — and what it costs — before you commit to anything."
      />

      {/*
        The scheduler goes above the form on purpose. Someone who is ready to
        book should not have to scroll past a message box to do it, and a
        booked slot is worth considerably more than an enquiry — it is the
        one action on this page with a date attached.
      */}
      {site.calendlyUrl && (
        <section id="schedule" className="scroll-mt-24 bg-ice py-16 sm:py-20">
          <div className="shell">
            <div className="text-center">
              <span className="eyebrow">Book a time</span>
              <h2 className="mx-auto mt-4 max-w-2xl text-[28px] leading-[1.15] sm:text-[34px]">
                Free 30-minute consultation
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-[16px] leading-[1.7] text-ink/65">
                Pick a slot and it&rsquo;s in the calendar — no phone tag. Mon
                to Thu, 9:30 to 5:00 ET.
              </p>
            </div>
            <Reveal delay={100}>
              <CalendlyEmbed
                url={site.calendlyUrl}
                className="mx-auto mt-10 max-w-3xl"
              />
            </Reveal>
          </div>
        </section>
      )}

      <section className="py-16 sm:py-20">
        <div className="shell grid gap-12 lg:grid-cols-[1.4fr_1fr] lg:gap-16">
          <Reveal>
            <h2 className="text-[24px]">Send a message</h2>
            <p className="mt-3 text-[15.5px] leading-[1.7] text-ink/65">
              Answered within one business day, usually sooner.
            </p>
            <div className="mt-8">
              <ContactForm />
            </div>
          </Reveal>

          <Reveal delay={100}>
            <div className="space-y-5">
              <div className="rounded-2xl border border-ink/10 bg-ink p-7 text-white">
                <h2 className="text-[13px] font-bold uppercase tracking-[0.14em] text-white/45">
                  Call us
                </h2>
                <a
                  href={site.phoneHref}
                  className="mt-3 block font-display text-[28px] font-extrabold text-white transition hover:text-gold-300"
                >
                  {site.phone}
                </a>
                <p className="mt-4 text-[14.5px] text-white/60">{site.hours}</p>
                <p className="mt-1 text-[13.5px] text-gold-300">
                  {site.seasonHours}
                </p>
              </div>

              <div className="rounded-2xl border border-ink/10 bg-white p-7 text-center">
                <p className="text-[14.5px] leading-[1.7] text-ink/65">
                  Wondering whether we&rsquo;re any good? Ask the people who
                  have already filed with us.
                </p>
                <GoogleReviews className="mt-4" />
              </div>

              <div className="rounded-2xl border border-ink/10 bg-white p-7">
                <h2 className="text-[13px] font-bold uppercase tracking-[0.14em] text-ink/45">
                  Email
                </h2>
                <a
                  href={`mailto:${site.email}`}
                  className="mt-3 block text-[16px] font-semibold text-ink underline underline-offset-4 transition hover:text-gold-700"
                >
                  {site.email}
                </a>
                <p className="mt-4 text-[14px] leading-[1.7] text-ink/55">
                  Please don&rsquo;t email Social Security numbers or full tax
                  documents. The secure intake form is the safe way to send
                  those.
                </p>
              </div>

              <div className="rounded-2xl border border-ink/10 bg-white p-7">
                <h2 className="text-[13px] font-bold uppercase tracking-[0.14em] text-ink/45">
                  Where we are
                </h2>
                <p className="mt-3 text-[16px] font-semibold text-ink">
                  {site.city}
                </p>
                <p className="mt-2 text-[14.5px] leading-[1.7] text-ink/60">
                  Filing remotely for clients in all 50 states. In-person
                  appointments available locally during filing season.
                </p>
              </div>

              <div className="rounded-2xl border border-gold-300 bg-gold-50 p-7">
                <h2 className="text-[16px] font-bold">Ready to file?</h2>
                <p className="mt-2 text-[14.5px] leading-[1.7] text-ink/70">
                  Skip the back-and-forth and start the intake form directly.
                </p>
                <Link href="/start" className="btn-gold mt-5 w-full">
                  File My Taxes
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
