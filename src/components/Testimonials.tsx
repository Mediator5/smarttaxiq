import { testimonials } from "@/lib/site";
import Reveal from "./Reveal";
import { SectionHeading } from "./Section";
import GoogleReviews from "./GoogleReviews";

function Stars() {
  return (
    <div className="flex gap-0.5" aria-label="5 out of 5 stars">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg
          key={i}
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
  );
}

/**
 * Testimonials, with the route to the live reviews underneath.
 *
 * Extracted from the About page so the same proof can sit on Pricing, where
 * it does more work: price is exactly the moment a visitor starts looking for
 * a reason to trust the number in front of them.
 */
export default function Testimonials({
  limit = 3,
  eyebrow = "In their words",
  title = "What clients say",
  intro,
  className = "",
}: {
  limit?: number;
  eyebrow?: string;
  title?: string;
  intro?: string;
  className?: string;
}) {
  return (
    <section className={`py-16 sm:py-20 ${className}`}>
      <div className="shell">
        <SectionHeading
          align="center"
          eyebrow={eyebrow}
          title={title}
          intro={intro}
        />
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {testimonials.slice(0, limit).map((t, i) => (
            <Reveal key={t.name} delay={i * 70}>
              <figure className="flex h-full flex-col rounded-2xl border border-ink/10 bg-white p-7 shadow-card">
                <Stars />
                <blockquote className="mt-5 flex-1 text-[15.5px] leading-[1.75] text-ink/80">
                  &ldquo;{t.quote}&rdquo;
                </blockquote>
                <figcaption className="mt-6 border-t border-ink/10 pt-5">
                  <span className="block text-[15px] font-bold">{t.name}</span>
                  <span className="mt-0.5 block text-[13px] text-ink/50">
                    {t.detail}
                  </span>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>

        {/*
          Someone who has just read three quotes is at the exact point of
          wondering whether they were written by the practice. The live
          profile is the only honest answer to that.
        */}
        <div className="mt-12 text-center">
          <GoogleReviews />
        </div>
      </div>
    </section>
  );
}
