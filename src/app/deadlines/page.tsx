import type { Metadata } from "next";
import Link from "next/link";
import CtaBand from "@/components/CtaBand";
import Reveal from "@/components/Reveal";
import { PageHero, SectionHeading } from "@/components/Section";
import { deadlines, formatDeadline, keyFigures } from "@/lib/deadlines";

export const metadata: Metadata = {
  title: "Tax Deadlines & Key Figures",
  description:
    "Federal filing and estimated-payment deadlines through 2027, plus the 2026 standard deduction and mileage rates. Verified against IRS guidance.",
  alternates: { canonical: "/deadlines" },
};

const WHO_LABEL: Record<string, string> = {
  individual: "Individuals",
  business: "Businesses",
  both: "Everyone",
};

export default function DeadlinesPage() {
  return (
    <>
      <PageHero
        eyebrow="Tax calendar"
        title="The dates that cost money if you miss them"
        intro="Federal deadlines through 2027, with what each one actually covers. Filing late and paying late are separate penalties — the first is ten times more expensive per month than the second."
      />

      <section className="py-16 sm:py-20">
        <div className="shell">
          <SectionHeading
            eyebrow="Federal calendar"
            title="What's coming up"
            intro="Dates shown are federal. Your state may differ, and we'll flag it if yours does."
          />

          <ol className="mt-12 space-y-4">
            {deadlines.map((d, i) => (
              <Reveal key={d.date} delay={Math.min(i, 6) * 40}>
                <li className="grid gap-4 rounded-2xl border border-ink/10 bg-white p-6 shadow-card sm:grid-cols-[210px_1fr] sm:gap-8 sm:p-7">
                  <div>
                    <p className="font-display text-[16px] font-extrabold text-ink">
                      {formatDeadline(d.date).replace(/^\w+, /, "")}
                    </p>
                    <p className="mt-1 text-[12.5px] text-ink/45">
                      {formatDeadline(d.date).split(",")[0]}
                    </p>
                    <span className="mt-3 inline-flex rounded-md bg-ice px-2.5 py-1 text-[11.5px] font-bold uppercase tracking-[0.1em] text-ink/55">
                      {WHO_LABEL[d.who]}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-[18px]">{d.label}</h3>
                    <p className="mt-2.5 text-[15px] leading-[1.75] text-ink/65">
                      {d.detail}
                    </p>
                  </div>
                </li>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      <section className="bg-ice py-16 sm:py-20">
        <div className="shell">
          <SectionHeading
            eyebrow="Key figures"
            title="Numbers people look up"
            intro="Tax year 2026 amounts. Note that the IRS raised the business mileage rate half way through 2026, so your log needs dates, not just a total."
          />

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {keyFigures.map((f, i) => (
              <Reveal key={f.label} delay={(i % 3) * 60}>
                <div className="h-full rounded-2xl border border-ink/10 bg-white p-6">
                  <p className="font-display text-[32px] font-extrabold leading-none text-ink">
                    {f.value}
                  </p>
                  <p className="mt-3 text-[14.5px] font-semibold leading-snug text-ink/80">
                    {f.label}
                  </p>
                  <p className="mt-1.5 text-[13px] text-ink/50">{f.note}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-20">
        <div className="shell grid gap-10 lg:grid-cols-2">
          <Reveal>
            <div className="h-full rounded-2xl border border-gold-300 bg-gold-50 p-8">
              <span className="eyebrow">Read this before you extend</span>
              <h2 className="mt-4 text-[24px] leading-snug">
                An extension moves the filing date, not the payment date
              </h2>
              <p className="mt-4 text-[15.5px] leading-[1.8] text-ink/75">
                Failure to file costs 5% of the unpaid tax per month, up to 25%.
                Failure to pay costs 0.5% per month. That is a tenfold
                difference — so if you can only do one, file. A balance you
                can&rsquo;t cover is almost always resolvable with an
                installment agreement.
              </p>
              <Link
                href="/resources/what-an-extension-actually-does"
                className="btn-outline mt-7"
              >
                Read the full breakdown
              </Link>
            </div>
          </Reveal>

          <Reveal delay={100}>
            <div className="h-full rounded-2xl border border-ink/10 bg-ink p-8 text-white">
              <span className="eyebrow-light">Safe harbour</span>
              <h2 className="mt-4 text-[24px] leading-snug !text-white">
                How to make quarterly payments without predicting the future
              </h2>
              <p className="mt-4 text-[15.5px] leading-[1.8] text-white/70">
                Pay in 100% of what you owed last year — 110% if your income was
                above $150,000 — and no underpayment penalty applies regardless
                of how this year turns out. Last year&rsquo;s number is already
                on a return you filed. Divide by four and you&rsquo;re done
                worrying about it.
              </p>
              <Link
                href="/resources/quarterly-estimated-payments"
                className="btn-outline-light mt-7"
              >
                How quarterlies work
              </Link>
            </div>
          </Reveal>
        </div>

        <div className="shell">
          <Reveal delay={140}>
            <p className="mt-12 text-[13.5px] leading-[1.7] text-ink/45">
              Dates and figures on this page were verified against IRS guidance
              in September 2026 and are general information, not advice for your
              situation. Deadlines falling on a weekend or federal holiday shift
              to the next business day, and disaster-area relief can move them
              further.
            </p>
          </Reveal>
        </div>
      </section>

      <CtaBand
        title="Get ahead of the next one"
        intro="Start your return now and the deadline stops being a deadline. Most returns are ready for review within a week."
        image="lashanda-legacy-planner.jpg"
      />
    </>
  );
}
