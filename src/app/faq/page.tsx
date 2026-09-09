import type { Metadata } from "next";
import Link from "next/link";
import Accordion from "@/components/Accordion";
import CtaBand from "@/components/CtaBand";
import Reveal from "@/components/Reveal";
import { PageHero } from "@/components/Section";
import LeadCapture from "@/components/LeadCapture";
import { allFaqs, faqGroups } from "@/lib/faq";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Frequently Asked Questions",
  description:
    "Answers on remote filing, turnaround, cost, refunds, IRS notices, unfiled years, extensions and quarterly payments.",
  alternates: { canonical: "/faq" },
};

export default function FaqPage() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: allFaqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <>
      <PageHero
        eyebrow="FAQ"
        title="The questions we're asked most"
        intro="If yours isn't here, call and ask. There's no charge for a question."
      >
        <div className="flex flex-wrap gap-2">
          {faqGroups.map((g) => (
            <a
              key={g.title}
              href={`#${g.title.toLowerCase().replace(/\s+/g, "-")}`}
              className="rounded-lg border border-white/20 px-4 py-2 text-[13.5px] font-medium text-white/75 transition hover:border-gold-400 hover:text-white"
            >
              {g.title}
            </a>
          ))}
        </div>
      </PageHero>

      <section className="py-16 sm:py-20">
        <div className="shell max-w-3xl">
          {faqGroups.map((group, gi) => (
            <div
              key={group.title}
              id={group.title.toLowerCase().replace(/\s+/g, "-")}
              className={`scroll-mt-28 ${gi > 0 ? "mt-16" : ""}`}
            >
              <Reveal>
                <div className="rule-gold" />
                <h2 className="mt-5 text-[24px] sm:text-[28px]">
                  {group.title}
                </h2>
              </Reveal>
              <Reveal delay={80}>
                <div className="mt-7">
                  <Accordion items={group.items} defaultOpen={gi === 0 ? 0 : null} />
                </div>
              </Reveal>
            </div>
          ))}

          <Reveal delay={100}>
            <div className="mt-16 rounded-2xl border border-ink/10 bg-ice p-8 text-center">
              <h2 className="text-[21px]">Still not answered?</h2>
              <p className="mx-auto mt-3 max-w-lg text-[15.5px] leading-[1.7] text-ink/65">
                Call and ask directly, or send it in writing and we&rsquo;ll
                come back within one business day.
              </p>
              <div className="mt-7 flex flex-wrap justify-center gap-3">
                <a href={site.phoneHref} className="btn-gold">
                  Call {site.phone}
                </a>
                <Link href="/contact" className="btn-outline">
                  Send a message
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <LeadCapture
        source="faq"
      />

      <CtaBand image="lashanda-headshot-polo.jpg" />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
    </>
  );
}
