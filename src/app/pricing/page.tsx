import type { Metadata } from "next";
import Link from "next/link";
import CtaBand from "@/components/CtaBand";
import Reveal from "@/components/Reveal";
import { BulletList, PageHero, SectionHeading } from "@/components/Section";
import { addOns, pricingPrinciples, tiers } from "@/lib/pricing";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Flat-fee tax preparation quoted before work starts. Typical ranges for simple, self-employed and business returns, plus add-on pricing.",
  alternates: { canonical: "/pricing" },
};

export default function PricingPage() {
  return (
    <>
      <PageHero
        eyebrow="Pricing"
        title="A number before we start, not a surprise after"
        intro="These are the ranges most returns land in. Your exact quote comes after we've seen what your return actually involves — and the conversation that produces it is free."
      />

      <section className="py-16 sm:py-20">
        <div className="shell">
          <div className="grid gap-6 lg:grid-cols-3">
            {tiers.map((tier, i) => (
              <Reveal key={tier.name} delay={i * 80}>
                <div
                  className={`flex h-full flex-col rounded-2xl border p-8 ${
                    tier.best
                      ? "border-gold-400 bg-white shadow-lift ring-1 ring-gold-400"
                      : "border-ink/10 bg-white shadow-card"
                  }`}
                >
                  {/* Rendered on every card so the prices line up across all
                      three; only the highlighted one is visible. */}
                  <span
                    aria-hidden={!tier.best}
                    className={`mb-4 inline-flex w-fit rounded-full px-3 py-1 text-[11.5px] font-bold uppercase tracking-[0.12em] ${
                      tier.best
                        ? "bg-gold-100 text-gold-800"
                        : "invisible bg-transparent"
                    }`}
                  >
                    Most common
                  </span>
                  <h2 className="text-[20px]">{tier.name}</h2>
                  <p className="mt-4 text-[12.5px] font-semibold uppercase tracking-[0.12em] text-ink/45">
                    {tier.unit}
                  </p>
                  <p className="mt-1 font-display text-[42px] font-extrabold leading-none text-ink">
                    {tier.price}
                  </p>
                  <p className="mt-5 text-[15px] leading-[1.7] text-ink/65">
                    {tier.summary}
                  </p>
                  <div className="mt-7 flex-1 border-t border-ink/10 pt-7">
                    <BulletList items={tier.includes} />
                  </div>
                  <Link
                    href="/start"
                    className={`mt-8 w-full ${
                      tier.best ? "btn-gold" : "btn-outline"
                    }`}
                  >
                    Get my quote
                  </Link>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-ice py-16 sm:py-20">
        <div className="shell grid gap-12 lg:grid-cols-[1fr_1.1fr] lg:items-start">
          <SectionHeading
            eyebrow="Add-ons"
            title="The things that change a price"
            intro="Each of these is genuine extra work, so each is priced separately rather than buried in a headline number."
          />
          <Reveal delay={100}>
            <ul className="divide-y divide-ink/10 overflow-hidden rounded-2xl border border-ink/10 bg-white">
              {addOns.map((a) => (
                <li
                  key={a.item}
                  className="flex items-center justify-between gap-6 px-6 py-4"
                >
                  <span className="text-[15px] text-ink/75">{a.item}</span>
                  <span className="shrink-0 font-display text-[15px] font-bold text-ink">
                    {a.price}
                  </span>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      <section className="py-16 sm:py-20">
        <div className="shell">
          <SectionHeading
            align="center"
            eyebrow="How we price"
            title="Three rules we don't bend"
          />
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {pricingPrinciples.map((p, i) => (
              <Reveal key={p.title} delay={i * 70}>
                <div className="h-full rounded-2xl border border-ink/10 bg-white p-7">
                  <div className="rule-gold" />
                  <h3 className="mt-5 text-[18px]">{p.title}</h3>
                  <p className="mt-3 text-[15px] leading-[1.75] text-ink/65">
                    {p.body}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal delay={120}>
            <p className="mx-auto mt-12 max-w-2xl text-center text-[14.5px] leading-[1.7] text-ink/55">
              Prices shown are starting points for straightforward returns of
              each type and are not a quote. Rental property, multiple states,
              prior-year filings and business complexity all change the number.
              Call{" "}
              <a
                href={site.phoneHref}
                className="font-semibold text-ink underline underline-offset-4"
              >
                {site.phone}
              </a>{" "}
              and you&rsquo;ll have a real figure in one conversation.
            </p>
          </Reveal>
        </div>
      </section>

      <CtaBand
        title="Get your actual number"
        intro="Fill in the intake form and we'll come back with a flat quote — free, in writing, within one business day."
        image="lashanda-gold-gown.jpg"
      />
    </>
  );
}
