import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import CtaBand from "@/components/CtaBand";
import Reveal from "@/components/Reveal";
import { BulletList, PageHero, SectionHeading } from "@/components/Section";
import { site, testimonials } from "@/lib/site";

export const metadata: Metadata = {
  title: "About",
  description:
    "Meet Lashanda Carter, founder and lead tax preparer at SmartTaxIQ — preparing returns since 2003 for individuals, freelancers and small businesses.",
  alternates: { canonical: "/about" },
};

const values = [
  {
    title: "Explain it, don't just file it",
    body: "A return you don't understand is a return you can't act on. Every filing comes with a plain-language walkthrough of what the numbers mean and what changed.",
  },
  {
    title: "Accuracy over optimism",
    body: "Nobody here will promise a bigger refund to win your business. We claim what you qualify for and nothing else — that is what keeps a return defensible three years later.",
  },
  {
    title: "Answer the phone",
    body: "Tax questions don't only happen in April. Clients reach a person year-round, and notices get read the week they arrive rather than the following spring.",
  },
  {
    title: "Price it up front",
    body: "You get a flat quote before work starts, and a re-quote before any extra work. No invoice should ever be a surprise.",
  },
];

export default function AboutPage() {
  const years = Math.max(1, new Date().getFullYear() - site.founded);

  return (
    <>
      <PageHero
        eyebrow="About"
        title="Taxes, prepared by someone who will pick up the phone"
        intro={`SmartTaxIQ is led by ${site.preparer.name}, who has been preparing returns since ${site.founded}. The practice is deliberately small — enough capacity to file well, not so much that your return becomes a ticket number.`}
      />

      <section className="py-16 sm:py-20">
        <div className="shell grid items-start gap-14 lg:grid-cols-[0.85fr_1fr]">
          <Reveal>
            <div className="relative aspect-[4/5] overflow-hidden rounded-2xl border border-ink/10">
              <Image
                src="/images/lashanda-headshot-polo.jpg"
                alt={site.preparer.name}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 460px"
                className="object-cover"
              />
            </div>
            <div className="mt-6 rounded-2xl border border-ink/10 bg-ice p-6">
              <p className="font-display text-[19px] font-extrabold">
                {site.preparer.name}
              </p>
              <p className="mt-1 text-[14px] text-gold-700">
                {site.preparer.role}
              </p>
              <p className="mt-4 text-[14.5px] leading-[1.7] text-ink/65">
                Based in {site.city}, filing for clients in all 50 states.
              </p>
            </div>
          </Reveal>

          <Reveal delay={100}>
            <span className="eyebrow">The short version</span>
            <h2 className="mt-4 text-[28px] leading-[1.2] sm:text-[34px]">
              {years} years of returns, and the same conversation every spring
            </h2>
            <div className="prose-tax mt-6 space-y-5">
              <p>
                People arrive holding a document they don&rsquo;t understand and
                a deadline they didn&rsquo;t choose. Some of them have been
                avoiding the mail for a year. Some filed with software and got a
                number that felt wrong. Some have three unfiled years and assume
                they&rsquo;re in more trouble than they are.
              </p>
              <p>
                In almost every case the situation is more fixable than it
                feels. What&rsquo;s missing isn&rsquo;t a clever strategy —
                it&rsquo;s someone willing to read the whole picture, say
                plainly what it means, and then do the work.
              </p>
              <p>
                That is what SmartTaxIQ was built to be. Returns prepared
                properly, reviewed twice, and explained in language that
                doesn&rsquo;t require a second opinion. Notices answered on your
                behalf. Quarterly payments set up so next April is a formality
                instead of an emergency.
              </p>
              <p>
                The practice is remote by design. Clients file from Michigan,
                Texas, Georgia and everywhere in between, and none of them have
                to take an afternoon off to sit in a waiting room.
              </p>
            </div>

            <div className="mt-9">
              <BulletList
                items={[
                  `Preparing individual and business returns since ${site.founded}`,
                  "Federal, state and multi-state filings",
                  "Prior-year and amended returns, including unfiled years",
                  "IRS notice response and installment agreements",
                  "Year-round planning, not just filing season",
                ]}
              />
            </div>

            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/start" className="btn-gold">
                Work with us
              </Link>
              <Link href="/process" className="btn-outline">
                How it works
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="bg-ice py-16 sm:py-20">
        <div className="shell">
          <SectionHeading
            align="center"
            eyebrow="How we work"
            title="Four commitments, held to in every return"
          />
          <div className="mt-12 grid gap-6 md:grid-cols-2">
            {values.map((v, i) => (
              <Reveal key={v.title} delay={(i % 2) * 70}>
                <div className="h-full rounded-2xl border border-ink/10 bg-white p-7">
                  <div className="rule-gold" />
                  <h3 className="mt-5 text-[19px]">{v.title}</h3>
                  <p className="mt-3 text-[15px] leading-[1.75] text-ink/65">
                    {v.body}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-20">
        <div className="shell">
          <SectionHeading
            align="center"
            eyebrow="In their words"
            title="What clients say"
          />
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {testimonials.map((t, i) => (
              <Reveal key={t.name} delay={i * 70}>
                <figure className="flex h-full flex-col rounded-2xl border border-ink/10 bg-white p-7 shadow-card">
                  <blockquote className="flex-1 text-[15.5px] leading-[1.75] text-ink/80">
                    &ldquo;{t.quote}&rdquo;
                  </blockquote>
                  <figcaption className="mt-6 border-t border-ink/10 pt-5">
                    <span className="block text-[15px] font-bold">
                      {t.name}
                    </span>
                    <span className="mt-0.5 block text-[13px] text-ink/50">
                      {t.detail}
                    </span>
                  </figcaption>
                </figure>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <CtaBand image="lashanda-gold-gown.jpg" />
    </>
  );
}
