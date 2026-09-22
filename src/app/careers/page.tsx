import type { Metadata } from "next";
import Image from "next/image";
import ApplicationForm from "@/components/ApplicationForm";
import Reveal from "@/components/Reveal";
import { BulletList, PageHero, SectionHeading } from "@/components/Section";
import { site } from "@/lib/site";

/**
 * Recruitment landing page for the 2027 season intake.
 *
 * Deliberately not in the main navigation: it is a seasonal campaign page
 * reached from an ad, a referral or a community post, and it should disappear
 * from the site's story once the intake closes. Take it out of the sitemap and
 * unpublish it after 30 September rather than leaving a dead job ad up.
 */
export const metadata: Metadata = {
  title: "Train as a Tax Preparer",
  description:
    "Smart Tax IQ is training five seasonal tax preparers in Detroit for the 2027 filing season. No experience needed. Training starts October 1.",
  alternates: { canonical: "/careers" },
  openGraph: {
    title: "Train as a tax preparer — Smart Tax IQ, Detroit",
    description:
      "Five seats. Ten weeks of training, starting October 1. Pass the exam in December and work the season.",
    url: `${site.url}/careers`,
  },
};

const timeline = [
  { when: "Now", what: "You apply. We call within one business day." },
  { when: "Late Sept", what: "A short interview — in person for office seats, video for remote." },
  { when: "Oct 1", what: "Training starts. Ten weeks, around your own schedule." },
  { when: "Mid Dec", what: "Final exam. Pass it and you have a seat." },
  { when: "Jan – Apr", what: "You work the season. 1099, paid per return." },
];

const suits = [
  "You're careful with detail and you'd rather ask than guess",
  "You can give it about four hours a week for ten weeks",
  "You're comfortable talking to people about money",
  "You want seasonal work that pays for a real skill, not a gig app",
];

const doesnt = [
  "You need full-time hours and a salary from January",
  "You want something you can half-finish",
  "You can't commit to the January–April window",
];

export default function CareersPage() {
  return (
    <>
      <PageHero
        eyebrow="Now hiring · 5 seats"
        title="Train as a tax preparer this season"
        intro="Smart Tax IQ is taking on five seasonal preparers for the 2027 filing season — three remote, two in our Detroit office. You don't need experience. We train you, free, starting October 1."
      >
        <div className="flex flex-wrap items-center gap-3">
          <a href="#apply" className="btn-gold">Apply — takes two minutes</a>
          <a href={site.phoneHref} className="btn-outline-light">
            Or call {site.phone}
          </a>
        </div>
      </PageHero>

      {/* ---------- the honest version ---------- */}
      <section className="py-16 sm:py-20">
        <div className="shell grid items-start gap-14 lg:grid-cols-[1fr_0.85fr] lg:gap-16">
          <Reveal>
            <span className="eyebrow">The honest version</span>
            <h2 className="mt-4 text-[28px] leading-[1.2] sm:text-[34px]">
              What we&rsquo;re actually offering, and what we&rsquo;re asking
            </h2>
            <div className="prose-tax mt-6 space-y-5">
              <p>
                Smart Tax IQ is the tax division of Carter Cole &amp; Associates
                LLC. Lashanda Carter has been preparing returns in Detroit since
                2003, and this season the practice is taking on a second
                location — which means it needs preparers to work it.
              </p>
              <p>
                <strong>The training is free and it&rsquo;s real.</strong> Ten
                weeks, nine modules, covering the 1040, filing status, the
                Earned Income Tax Credit, Schedule C, and the Michigan and
                Detroit returns almost every local client needs. It finishes
                with an exam.
              </p>
              <p>
                <strong>Passing that exam is what gets you a seat.</strong> Not
                turning up, not finishing the modules — passing. We&rsquo;re
                putting five people in front of real clients and their real
                money, and the standard is the standard.
              </p>
              <p>
                In return: a skill that&rsquo;s yours permanently, a season of
                paid work, and a practice that answers the phone when
                you&rsquo;re stuck.
              </p>
            </div>
          </Reveal>

          <Reveal delay={100}>
            <div className="relative aspect-[4/5] overflow-hidden rounded-2xl border border-ink/10 shadow-card">
              <Image
                src="/images/lashanda-laptop-laughing.jpg"
                alt={site.preparer.name}
                fill
                sizes="(max-width: 1024px) 100vw, 440px"
                className="object-cover"
              />
            </div>
            <div className="mt-5 rounded-2xl border border-ink/10 bg-ice p-6">
              <p className="text-[15px] leading-[1.7] text-ink/75">
                &ldquo;I&rsquo;m not looking for people who already know how to
                do this. I&rsquo;m looking for people who&rsquo;ll be careful
                with somebody&rsquo;s return.&rdquo;
              </p>
              <p className="mt-3 text-[13.5px] font-bold text-ink">
                {site.preparer.name}
              </p>
              <p className="text-[13px] text-ink/55">{site.preparer.role}</p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---------- two roles ---------- */}
      <section className="bg-ice py-16 sm:py-20">
        <div className="shell">
          <SectionHeading
            align="center"
            eyebrow="Two ways in"
            title="Three remote seats, two in the office"
            intro="Same training, same exam, same pay structure. What differs is where you work and how you learn."
          />
          <div className="mt-12 grid gap-6 md:grid-cols-2">
            <Reveal>
              <div className="flex h-full flex-col rounded-2xl border border-ink/10 bg-white p-8 shadow-card">
                <span className="eyebrow">3 seats</span>
                <h3 className="mt-3 font-display text-[22px] font-extrabold text-ink">
                  Remote preparer
                </h3>
                <p className="mt-3 text-[15.5px] leading-[1.7] text-ink/70">
                  Study when it suits you — evenings, weekends, early mornings.
                  Work the season from home.
                </p>
                <div className="mt-6">
                  <BulletList
                    items={[
                      "Self-paced online modules, one live group clinic a week",
                      "Questions answered same day in the group channel",
                      "Work from anywhere within reach of Detroit",
                      "Suits someone disciplined enough to keep their own pace",
                    ]}
                  />
                </div>
              </div>
            </Reveal>
            <Reveal delay={90}>
              <div className="flex h-full flex-col rounded-2xl border border-gold-300 bg-white p-8 shadow-card">
                <span className="eyebrow">2 seats</span>
                <h3 className="mt-3 font-display text-[22px] font-extrabold text-ink">
                  In-office preparer
                </h3>
                <p className="mt-3 text-[15.5px] leading-[1.7] text-ink/70">
                  Learn it alongside someone who&rsquo;s done it for twenty
                  years. Clients walk in — you won&rsquo;t be hunting for work.
                </p>
                <div className="mt-6">
                  <BulletList
                    items={[
                      "Two half-days a week at the Detroit office through training",
                      "Someone experienced beside you, not on the end of an email",
                      "Walk-in and returning clients from January",
                      "Suits someone who learns by doing and stays steady when it's busy",
                    ]}
                  />
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ---------- timeline ---------- */}
      <section className="py-16 sm:py-20">
        <div className="shell">
          <SectionHeading
            eyebrow="What happens next"
            title="From applying to working the season"
          />
          <div className="mt-10 max-w-3xl">
            {timeline.map((t, i) => (
              <Reveal key={t.when} delay={i * 60}>
                <div className="grid grid-cols-[92px_1fr] gap-5 border-t border-ink/10 py-5 sm:grid-cols-[130px_1fr]">
                  <span className="font-mono text-[13px] font-semibold text-gold-700">
                    {t.when}
                  </span>
                  <span className="text-[15.5px] leading-[1.65] text-ink/80">
                    {t.what}
                  </span>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- fit ---------- */}
      <section className="bg-ice py-16 sm:py-20">
        <div className="shell grid gap-10 md:grid-cols-2 md:gap-14">
          <Reveal>
            <h3 className="font-display text-[21px] font-extrabold text-ink">
              This suits you if
            </h3>
            <div className="mt-5">
              <BulletList items={suits} />
            </div>
          </Reveal>
          <Reveal delay={90}>
            <h3 className="font-display text-[21px] font-extrabold text-ink">
              It probably doesn&rsquo;t if
            </h3>
            <ul className="mt-5 space-y-3">
              {doesnt.map((d) => (
                <li key={d} className="flex gap-3">
                  <span
                    aria-hidden
                    className="mt-[9px] h-px w-4 shrink-0 bg-ink/25"
                  />
                  <span className="text-[15.5px] leading-[1.65] text-ink/60">
                    {d}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-6 text-[14.5px] leading-[1.7] text-ink/55">
              We&rsquo;d rather tell you now than three weeks into the training.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ---------- form ---------- */}
      <section id="apply" className="scroll-mt-24 py-16 sm:py-20">
        <div className="shell grid items-start gap-12 lg:grid-cols-[1fr_0.8fr] lg:gap-16">
          <Reveal>
            <span className="eyebrow">Apply</span>
            <h2 className="mt-4 text-[28px] leading-[1.2] sm:text-[34px]">
              Two minutes, and we&rsquo;ll call you
            </h2>
            <p className="mt-4 max-w-xl text-[16px] leading-[1.7] text-ink/65">
              The first few questions decide whether this is worth a phone call
              for both of us. Answer them straight — a &ldquo;no&rdquo; saves
              you a conversation you didn&rsquo;t want.
            </p>
            <div className="mt-9">
              <ApplicationForm />
            </div>
          </Reveal>

          <Reveal delay={100}>
            <div className="rounded-2xl border border-ink/10 bg-ink p-7 text-white lg:sticky lg:top-24">
              <h3 className="font-display text-[19px] font-extrabold">
                Rather just talk?
              </h3>
              <p className="mt-3 text-[15px] leading-[1.7] text-white/65">
                Call and ask. There&rsquo;s no script and no pressure — plenty
                of people want to know what the work is really like before they
                fill anything in.
              </p>
              <a
                href={site.phoneHref}
                className="mt-6 block font-display text-[26px] font-extrabold text-white transition hover:text-gold-300"
              >
                {site.phone}
              </a>
              <p className="mt-2 text-[14px] text-white/55">{site.hours}</p>
              <p className="mt-6 border-t border-white/12 pt-5 text-[13px] leading-[1.7] text-white/45">
                {site.divisionStatement} All positions are 1099 contract roles
                for the 2027 filing season.
              </p>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
