import type { Metadata } from "next";
import IntakeForms from "@/components/IntakeForms";
import Reveal from "@/components/Reveal";
import { BulletList, PageHero } from "@/components/Section";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Start Your Return",
  description:
    "Begin your personal or business tax return online. Secure intake, document upload, and a flat quote back within one business day.",
  alternates: { canonical: "/start" },
};

export default function StartPage() {
  return (
    <>
      <PageHero
        eyebrow="Start your return"
        title="Fifteen minutes now, and it's off your plate"
        intro="Pick the form that matches your situation and work through it at your own pace — it saves as you go. We'll reply with a flat quote and a timeline within one business day."
      />

      <section className="py-14 sm:py-16">
        <div className="shell grid gap-12 lg:grid-cols-[1.6fr_1fr] lg:items-start">
          <Reveal>
            <IntakeForms />
          </Reveal>

          <Reveal delay={100} className="lg:sticky lg:top-32">
            <div className="rounded-2xl border border-ink/10 bg-ice p-7">
              <h2 className="text-[18px]">What happens next</h2>
              <ol className="mt-6 space-y-5">
                {[
                  ["1", "We read your intake within one business day."],
                  ["2", "You get a flat quote and a document list."],
                  ["3", "Your return is prepared and double-checked."],
                  ["4", "We walk you through it before anything is filed."],
                ].map(([n, text]) => (
                  <li key={n} className="flex gap-4">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-ink text-[13px] font-bold text-gold-400">
                      {n}
                    </span>
                    <span className="text-[15px] leading-[1.65] text-ink/75">
                      {text}
                    </span>
                  </li>
                ))}
              </ol>

              <div className="mt-8 border-t border-ink/10 pt-7">
                <h3 className="text-[13px] font-bold uppercase tracking-[0.14em] text-ink/45">
                  Have ready if you can
                </h3>
                <div className="mt-5">
                  <BulletList
                    items={[
                      "Photo ID and SSNs",
                      "Last year's return",
                      "All W-2s and 1099s",
                      "Bank details for direct deposit",
                    ]}
                  />
                </div>
                <p className="mt-5 text-[14px] leading-[1.7] text-ink/55">
                  Missing something? Start anyway. We can often pull an IRS
                  transcript to fill the gaps.
                </p>
              </div>

              <div className="mt-8 border-t border-ink/10 pt-7">
                <h3 className="text-[13px] font-bold uppercase tracking-[0.14em] text-ink/45">
                  Rather talk first?
                </h3>
                <a
                  href={site.phoneHref}
                  className="mt-3 block font-display text-[22px] font-extrabold text-ink transition hover:text-gold-700"
                >
                  {site.phone}
                </a>
                <p className="mt-1 text-[14px] text-ink/55">{site.hours}</p>
                <p className="mt-1 text-[13.5px] text-ink/45">
                  {site.seasonHours}
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
