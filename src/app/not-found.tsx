import Link from "next/link";
import { site } from "@/lib/site";

export default function NotFound() {
  return (
    <section className="bg-ink py-24 text-white sm:py-32">
      <div className="shell max-w-2xl text-center">
        <p className="font-display text-[64px] font-extrabold leading-none text-gold-400">
          404
        </p>
        <h1 className="mt-6 text-[30px] leading-tight !text-white sm:text-[38px]">
          That page isn&rsquo;t here
        </h1>
        <p className="mt-5 text-[16.5px] leading-[1.75] text-white/65">
          The link may be out of date. Everything on the site is one click from
          here — or call {site.phone} and we&rsquo;ll point you at it.
        </p>
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <Link href="/" className="btn-gold">
            Back to home
          </Link>
          <Link href="/start" className="btn-outline-light">
            File My Taxes
          </Link>
        </div>
        <div className="mt-12 flex flex-wrap justify-center gap-x-6 gap-y-3 border-t border-white/10 pt-8 text-[14px]">
          {[
            ["/services", "Services"],
            ["/pricing", "Pricing"],
            ["/deadlines", "Deadlines"],
            ["/resources", "Resources"],
            ["/faq", "FAQ"],
            ["/contact", "Contact"],
          ].map(([href, label]) => (
            <Link
              key={href}
              href={href}
              className="text-white/60 transition hover:text-gold-300"
            >
              {label}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
