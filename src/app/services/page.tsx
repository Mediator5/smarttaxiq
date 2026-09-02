import type { Metadata } from "next";
import Link from "next/link";
import CtaBand from "@/components/CtaBand";
import Reveal from "@/components/Reveal";
import { BulletList, PageHero } from "@/components/Section";
import { services } from "@/lib/site";

export const metadata: Metadata = {
  title: "Tax Services",
  description:
    "Individual and business tax preparation, self-employed filing, year-round planning, amended returns and IRS notice help. Filed remotely, nationwide.",
  alternates: { canonical: "/services" },
};

export default function ServicesPage() {
  return (
    <>
      <PageHero
        eyebrow="Services"
        title="Everything a tax year can throw at you"
        intro="Six services, one preparer, and a review process that treats your return as a document someone will have to defend rather than a form to be completed."
      >
        <div className="flex flex-wrap gap-2">
          {services.map((s) => (
            <a
              key={s.slug}
              href={`#${s.slug}`}
              className="rounded-lg border border-white/20 px-4 py-2 text-[13.5px] font-medium text-white/75 transition hover:border-gold-400 hover:text-white"
            >
              {s.title}
            </a>
          ))}
        </div>
      </PageHero>

      <div className="divide-y divide-ink/8">
        {services.map((s, i) => (
          <section
            key={s.slug}
            id={s.slug}
            className={`scroll-mt-28 py-16 sm:py-20 ${
              i % 2 === 1 ? "bg-ice" : ""
            }`}
          >
            <div className="shell grid gap-12 lg:grid-cols-[1fr_1fr] lg:gap-16">
              <Reveal>
                <span className="eyebrow">{s.who}</span>
                <h2 className="mt-4 text-[26px] leading-[1.2] sm:text-[32px]">
                  {s.title}
                </h2>
                <p className="mt-5 text-[17px] font-medium leading-[1.65] text-ink/80">
                  {s.short}
                </p>
                <p className="prose-tax mt-5">{s.body}</p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Link href="/start" className="btn-gold">
                    Start this
                  </Link>
                  <Link href="/pricing" className="btn-outline">
                    What it costs
                  </Link>
                </div>
              </Reveal>

              <Reveal delay={100}>
                <div className="rounded-2xl border border-ink/10 bg-white p-8">
                  <h3 className="text-[13px] font-bold uppercase tracking-[0.14em] text-ink/45">
                    What&rsquo;s included
                  </h3>
                  <div className="mt-6">
                    <BulletList items={s.bullets} />
                  </div>
                </div>
              </Reveal>
            </div>
          </section>
        ))}
      </div>

      <CtaBand
        title="Not sure which one you need?"
        intro="Describe your situation in a sentence and we'll tell you what applies — and what it will cost — before you commit to anything."
        image="lashanda-headshot-polo.jpg"
      />
    </>
  );
}
