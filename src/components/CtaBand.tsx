import Image from "next/image";
import Link from "next/link";
import { site } from "@/lib/site";
import Reveal from "./Reveal";

export default function CtaBand({
  title = "Ready to get it filed?",
  intro = "Start your return online in about ten minutes. You'll get a real preparer, a real review, and a plain answer on where you stand.",
  image = "lashanda-mug.jpg",
}: {
  title?: string;
  intro?: string;
  image?: string;
}) {
  return (
    <section className="relative overflow-hidden bg-ink py-20 text-white sm:py-24">
      <div
        aria-hidden
        className="pointer-events-none absolute -left-40 top-1/2 h-[480px] w-[480px] -translate-y-1/2 rounded-full bg-gold-500/10 blur-3xl"
      />
      <div className="shell relative grid items-center gap-12 lg:grid-cols-[1.2fr_1fr]">
        <Reveal>
          <span className="eyebrow-light">Next step</span>
          <h2 className="mt-4 text-[30px] leading-[1.14] !text-white sm:text-[40px]">
            {title}
          </h2>
          <p className="mt-6 max-w-xl text-[17px] leading-[1.75] text-white/70">
            {intro}
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link href="/start" className="btn-gold">
              File My Taxes
            </Link>
            <a href={site.phoneHref} className="btn-outline-light">
              Call {site.phone}
            </a>
          </div>
          <p className="mt-6 text-[13.5px] text-white/45">
            {site.hours} · Every message answered within one business day.
          </p>
        </Reveal>

        <Reveal delay={120} className="hidden lg:block">
          <div className="relative aspect-[4/5] overflow-hidden rounded-2xl border border-white/10">
            <Image
              src={`/images/${image}`}
              alt={site.preparer.name}
              fill
              sizes="(max-width: 1024px) 0px, 420px"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-ink/60 to-transparent" />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
