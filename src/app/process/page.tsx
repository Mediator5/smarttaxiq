import type { Metadata } from "next";
import Link from "next/link";
import CtaBand from "@/components/CtaBand";
import Reveal from "@/components/Reveal";
import { BulletList, PageHero, SectionHeading } from "@/components/Section";
import LeadCapture from "@/components/LeadCapture";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "How It Works",
  description:
    "How filing with SmartTaxIQ works, start to finish: intake, document upload, preparation, a review call, your approval, then e-file. Fully remote.",
  alternates: { canonical: "/process" },
};

const steps = [
  {
    n: "01",
    title: "Tell us about your year",
    time: "About 15 minutes",
    body: "You fill in the secure intake form — who's on the return, what income you had, what changed since last year. There are two versions, one for personal returns and one for businesses, and you pick the one that fits.",
    points: [
      "Works on a phone",
      "Save and come back to it",
      "Upload documents as you go",
    ],
  },
  {
    n: "02",
    title: "We confirm scope and price",
    time: "Within one business day",
    body: "Before any work starts you get a flat quote based on what your return actually involves. If something in your intake suggests the return is more or less than you expected, we say so then — not after.",
    points: [
      "Written, flat quote",
      "No charge for this conversation",
      "Re-quoted before any extra work",
    ],
  },
  {
    n: "03",
    title: "Your return is prepared",
    time: "3–5 business days, typically",
    body: "A licensed preparer builds the return, reads your prior-year filing alongside it, and checks credits line by line. Anything missing gets one clear list rather than a trickle of emails.",
    points: [
      "Prior year read for missed items",
      "Credits checked individually",
      "One consolidated document request",
    ],
  },
  {
    n: "04",
    title: "We review it together",
    time: "20–30 minutes",
    body: "You get a call or a written summary — your choice — covering what the numbers say, what changed from last year, and anything worth doing differently before December.",
    points: [
      "Plain-language walkthrough",
      "Questions answered before signing",
      "Planning notes for next year",
    ],
  },
  {
    n: "05",
    title: "You approve, we e-file",
    time: "Same day",
    body: "Nothing is transmitted until you sign. Once it goes, you get confirmation of acceptance and a complete copy of everything filed, in a format you can hand to a lender.",
    points: [
      "Electronic signature",
      "IRS acceptance confirmed to you",
      "Full PDF copy for your records",
    ],
  },
  {
    n: "06",
    title: "We stay reachable",
    time: "All year",
    body: "Tax questions don't only occur in April. If a notice arrives, a lender needs a document, or you're deciding something with tax consequences, the line stays open.",
    points: [
      "Notices read and answered",
      "Mid-year projections available",
      "Quarterly reminders if you need them",
    ],
  },
];

export default function ProcessPage() {
  return (
    <>
      <PageHero
        eyebrow="How it works"
        title="Six steps, no office visit, no guesswork"
        intro="You'll always know what happens next, what it costs, and when it's due. Nothing gets filed without your say-so."
      >
        <Link href="/start" className="btn-gold">
          Start step one
        </Link>
      </PageHero>

      <section className="py-16 sm:py-20">
        <div className="shell">
          <ol className="space-y-6">
            {steps.map((step, i) => (
              <Reveal key={step.n} delay={i * 50}>
                <li className="grid gap-6 rounded-2xl border border-ink/10 bg-white p-7 shadow-card sm:grid-cols-[auto_1fr] sm:gap-8 sm:p-9">
                  <div className="sm:w-32">
                    <span className="font-display text-[38px] font-extrabold leading-none text-gold-300">
                      {step.n}
                    </span>
                    <p className="mt-2 text-[12.5px] font-semibold text-ink/45">
                      {step.time}
                    </p>
                  </div>
                  <div className="grid gap-6 md:grid-cols-[1.5fr_1fr]">
                    <div>
                      <h2 className="text-[21px]">{step.title}</h2>
                      <p className="mt-3 text-[15.5px] leading-[1.75] text-ink/70">
                        {step.body}
                      </p>
                    </div>
                    <div className="rounded-xl bg-ice p-5">
                      <BulletList items={step.points} />
                    </div>
                  </div>
                </li>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      <section className="bg-ice py-16 sm:py-20">
        <div className="shell grid gap-12 lg:grid-cols-[1fr_1.1fr] lg:items-start">
          <SectionHeading
            eyebrow="Before you start"
            title="What to have ready"
            intro="You don't need all of this to begin — the form saves as you go — but a complete file is what turns three weeks into three days."
          />
          <Reveal delay={100}>
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="rounded-2xl border border-ink/10 bg-white p-6">
                <h3 className="text-[15px] font-bold">Everyone</h3>
                <div className="mt-4">
                  <BulletList
                    items={[
                      "Photo ID",
                      "SSNs for everyone on the return",
                      "Last year's return",
                      "All W-2s and 1099s",
                      "Bank details for direct deposit",
                    ]}
                  />
                </div>
              </div>
              <div className="rounded-2xl border border-ink/10 bg-white p-6">
                <h3 className="text-[15px] font-bold">If self-employed</h3>
                <div className="mt-4">
                  <BulletList
                    items={[
                      "Income totals by source",
                      "Expenses by category",
                      "Business mileage for the year",
                      "Home office square footage",
                      "Equipment bought this year",
                    ]}
                  />
                </div>
              </div>
            </div>
            <p className="mt-6 text-[14.5px] text-ink/55">
              Missing something? Start anyway — we can often pull an IRS wage
              and income transcript to fill the gaps. Or call{" "}
              <a
                href={site.phoneHref}
                className="font-semibold text-ink underline underline-offset-4"
              >
                {site.phone}
              </a>
              .
            </p>
          </Reveal>
        </div>
      </section>

      <LeadCapture
        source="process"
      />

      <CtaBand
        title="Step one takes about fifteen minutes"
        intro="Fill in the intake form whenever suits you. We'll come back with a quote and a timeline within one business day."
        image="lashanda-laptop-laughing.jpg"
      />
    </>
  );
}
