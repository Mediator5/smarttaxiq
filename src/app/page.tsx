import Image from "next/image";
import Link from "next/link";
import CtaBand from "@/components/CtaBand";
import Reveal from "@/components/Reveal";
import { BulletList, SectionHeading } from "@/components/Section";
import LeadCapture from "@/components/LeadCapture";
import { deadlines, formatDeadline } from "@/lib/deadlines";
import { services, site, testimonials } from "@/lib/site";

const steps = [
  {
    n: "01",
    title: "Send your documents",
    body: "Fill in the secure intake form and upload your W-2s, 1099s and anything else you have. Fifteen minutes, from your phone.",
  },
  {
    n: "02",
    title: "We prepare and review",
    body: "A licensed preparer builds your return, checks it against your prior year, and looks for credits and deductions you didn't claim.",
  },
  {
    n: "03",
    title: "You approve, we file",
    body: "We walk you through the numbers before anything is sent. Nothing is filed until you say so, and you keep a copy of everything.",
  },
];

export default function HomePage() {
  const years = Math.max(1, new Date().getFullYear() - site.founded);
  const upcoming = deadlines.slice(0, 3);

  return (
    <>
      {/* ---------------- Hero ---------------- */}
      <section className="relative overflow-hidden bg-ink text-white">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-32 h-[520px] w-[520px] rounded-full bg-gold-500/12 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-52 -left-20 h-[420px] w-[420px] rounded-full bg-mint-500/10 blur-3xl"
        />

        <div className="shell relative grid items-center gap-14 py-16 sm:py-20 lg:grid-cols-[1.18fr_0.9fr] lg:py-24">
          <Reveal>
            <span className="eyebrow-light">
              <span className="h-1.5 w-1.5 rounded-full bg-gold-500" />
              Licensed preparer · Filing nationwide
            </span>

            <h1 className="mt-6 text-[38px] leading-[1.08] !text-white sm:text-[48px] lg:text-[52px]">
              Your taxes, done right — and{" "}
              <span className="text-gold-400">explained</span> so they make
              sense.
            </h1>

            <p className="mt-7 max-w-xl text-[17.5px] leading-[1.75] text-white/70">
              Software gives you a number. We give you an answer. Every return
              is prepared and reviewed by a person who will tell you what it
              means, what it cost you, and what to change before next year.
            </p>

            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/start" className="btn-gold">
                File My Taxes
              </Link>
              <Link href="/pricing" className="btn-outline-light">
                See what it costs
              </Link>
            </div>

            <dl className="mt-12 grid max-w-lg grid-cols-3 gap-6 border-t border-white/12 pt-8">
              {[
                { k: `${years}+`, v: "Years preparing returns" },
                { k: "50", v: "States served remotely" },
                { k: "1 day", v: "Typical reply time" },
              ].map((stat) => (
                <div key={stat.v}>
                  <dt className="font-display text-[26px] font-extrabold text-gold-400 sm:text-[30px]">
                    {stat.k}
                  </dt>
                  <dd className="mt-1.5 text-[13px] leading-snug text-white/55">
                    {stat.v}
                  </dd>
                </div>
              ))}
            </dl>
          </Reveal>

          <Reveal delay={140} className="relative">
            <div className="relative mx-auto aspect-[4/5] w-full max-w-[440px] overflow-hidden rounded-2xl border border-white/12 shadow-lift">
              <Image
                src="/images/lashanda-arms-crossed.jpg"
                alt={`${site.preparer.name}, ${site.preparer.role}`}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 440px"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-transparent to-transparent" />
              <div className="absolute inset-x-5 bottom-5 rounded-xl border border-white/12 bg-ink/80 p-5 backdrop-blur">
                <p className="font-display text-[16px] font-bold text-white">
                  {site.preparer.name}
                </p>
                <p className="mt-1 text-[13px] text-gold-300">
                  {site.preparer.role}
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---------------- Trust bar ---------------- */}
      <section className="border-b border-ink/8 bg-ice">
        <div className="shell grid gap-6 py-8 sm:grid-cols-2 lg:grid-cols-4">
          {[
            "Prepared by a person, not a chatbot",
            "Flat pricing, quoted before we start",
            "Every return reviewed twice",
            "Three-year lookback included",
          ].map((item, i) => (
            <Reveal key={item} delay={i * 60}>
              <div className="flex items-start gap-3">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="mt-[3px] shrink-0"
                  aria-hidden
                >
                  <path
                    d="M20 6L9 17l-5-5"
                    stroke="#10a878"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span className="text-[14.5px] font-medium leading-snug text-ink/80">
                  {item}
                </span>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ---------------- Services ---------------- */}
      <section className="py-20 sm:py-24">
        <div className="shell">
          <SectionHeading
            eyebrow="What we do"
            title="Six ways we take taxes off your plate"
            intro="Whether it's one W-2 or an S-corp with a stack of K-1s, the work is the same: get it right, get it filed, and tell you plainly what it means."
          />

          <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {services.map((s, i) => (
              <Reveal key={s.slug} delay={(i % 3) * 70}>
                <Link
                  href={`/services#${s.slug}`}
                  className="group flex h-full flex-col rounded-2xl border border-ink/10 bg-white p-7 shadow-card transition duration-200 hover:-translate-y-0.5 hover:border-gold-400 hover:shadow-lift"
                >
                  <span className="text-[11.5px] font-bold uppercase tracking-[0.14em] text-gold-700">
                    {s.who}
                  </span>
                  <h3 className="mt-4 text-[19px] leading-snug">{s.title}</h3>
                  <p className="mt-3 flex-1 text-[15px] leading-[1.7] text-ink/65">
                    {s.short}
                  </p>
                  <span className="mt-6 inline-flex items-center gap-2 text-[14px] font-semibold text-ink">
                    Read more
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      className="transition group-hover:translate-x-1"
                      aria-hidden
                    >
                      <path
                        d="M5 12h14m-6-6l6 6-6 6"
                        stroke="#d8b038"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- Process ---------------- */}
      <section className="bg-ice py-20 sm:py-24">
        <div className="shell">
          <SectionHeading
            eyebrow="How it works"
            title="Three steps, and you're done"
            intro="You never have to come to an office. Everything happens by secure form, phone and email — on your schedule."
          />

          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {steps.map((step, i) => (
              <Reveal key={step.n} delay={i * 80}>
                <div className="flex h-full flex-col rounded-2xl border border-ink/10 bg-white p-8">
                  <span className="font-display text-[34px] font-extrabold text-gold-300">
                    {step.n}
                  </span>
                  <h3 className="mt-4 text-[19px]">{step.title}</h3>
                  <p className="mt-3 text-[15px] leading-[1.7] text-ink/65">
                    {step.body}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal delay={100}>
            <div className="mt-10">
              <Link href="/process" className="btn-outline">
                See the full process
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---------------- Why us ---------------- */}
      <section className="py-20 sm:py-24">
        <div className="shell grid items-center gap-14 lg:grid-cols-2">
          <Reveal>
            <div className="relative aspect-[5/4] overflow-hidden rounded-2xl border border-ink/10">
              <Image
                src="/images/lashanda-desk-writing.jpg"
                alt={`${site.preparer.name} preparing a return`}
                fill
                sizes="(max-width: 1024px) 100vw, 560px"
                className="object-cover"
              />
            </div>
          </Reveal>

          <Reveal delay={100}>
            <span className="eyebrow">Why SmartTaxIQ</span>
            <h2 className="mt-4 text-[28px] leading-[1.18] sm:text-[36px]">
              The difference is the review, not the software
            </h2>
            <p className="mt-5 text-[16.5px] leading-[1.8] text-ink/70">
              Every preparer uses professional software. What separates a good
              return from an expensive one is whether anybody looked at it
              closely — at last year&rsquo;s filing, at the credits you qualify for
              now, at the notice sitting on your counter.
            </p>
            <div className="mt-8">
              <BulletList
                items={[
                  "Your prior-year return read before this year's is built",
                  "A written summary of what changed and why",
                  "Credits checked line by line, not left to a wizard",
                  "Quarterly payment schedule if you're self-employed",
                  "We answer the IRS letter, you don't",
                ]}
              />
            </div>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/about" className="btn-ink">
                Meet your preparer
              </Link>
              <Link href="/faq" className="btn-outline">
                Common questions
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---------------- Deadlines ---------------- */}
      <section className="bg-ink py-20 text-white sm:py-24">
        <div className="shell">
          <div className="grid gap-12 lg:grid-cols-[1fr_1.25fr] lg:items-center">
            <SectionHeading
              light
              eyebrow="Don't miss one"
              title="The dates that actually cost money"
              intro="Late filing and late payment are two different penalties, and both compound. Here's what's coming up."
            />

            <Reveal delay={100}>
              <ul className="divide-y divide-white/10 border-y border-white/10">
                {upcoming.map((d) => (
                  <li
                    key={d.date}
                    className="flex flex-col gap-1 py-5 sm:flex-row sm:items-baseline sm:gap-6"
                  >
                    <span className="w-44 shrink-0 font-display text-[15px] font-bold text-gold-400">
                      {formatDeadline(d.date).replace(/^\w+, /, "")}
                    </span>
                    <span className="text-[15.5px] leading-snug text-white/80">
                      {d.label}
                    </span>
                  </li>
                ))}
              </ul>
              <Link href="/deadlines" className="btn-outline-light mt-8">
                Full deadline calendar
              </Link>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ---------------- Testimonials ---------------- */}
      <section className="py-20 sm:py-24">
        <div className="shell">
          <SectionHeading
            align="center"
            eyebrow="Client results"
            title="What people say afterwards"
          />

          <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {testimonials.map((t, i) => (
              <Reveal key={t.name} delay={i * 70}>
                <figure className="flex h-full flex-col rounded-2xl border border-ink/10 bg-white p-7 shadow-card">
                  <div className="flex gap-0.5" aria-label="5 out of 5 stars">
                    {Array.from({ length: 5 }).map((_, s) => (
                      <svg
                        key={s}
                        width="15"
                        height="15"
                        viewBox="0 0 24 24"
                        fill="#d8b038"
                        aria-hidden
                      >
                        <path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4 6.1 20.5l1.2-6.5-4.8-4.6 6.6-.9z" />
                      </svg>
                    ))}
                  </div>
                  <blockquote className="mt-5 flex-1 text-[15.5px] leading-[1.75] text-ink/80">
                    &ldquo;{t.quote}&rdquo;
                  </blockquote>
                  <figcaption className="mt-6 border-t border-ink/10 pt-5">
                    <span className="block text-[15px] font-bold text-ink">
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

      <LeadCapture
        source="home"
      />

      <CtaBand />
    </>
  );
}
