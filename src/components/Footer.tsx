import Link from "next/link";
import { services, site, streetLine } from "@/lib/site";
import Logo from "./Logo";

const company = [
  { href: "/about", label: "About" },
  { href: "/process", label: "How It Works" },
  { href: "/pricing", label: "Pricing" },
  { href: "/deadlines", label: "Tax Deadlines" },
  { href: "/resources", label: "Resources" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact" },
];

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-ink text-white">
      <div className="mx-auto w-full max-w-shell px-5 py-16 sm:px-8 sm:py-20">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr_1fr_1.1fr]">
          <div>
            <Logo variant="light" width={196} />
            <p className="mt-6 max-w-xs text-[15px] leading-[1.75] text-white/60">
              Licensed tax preparation and year-round planning for individuals,
              freelancers and small businesses. File from anywhere in the U.S.
            </p>
            <p className="mt-6 text-[12px] font-bold uppercase tracking-[0.16em] text-gold-400">
              Preparing returns since {site.founded}
            </p>
          </div>

          <nav aria-label="Services">
            <h2 className="text-[11.5px] font-bold uppercase tracking-[0.16em] text-white/40">
              Services
            </h2>
            <ul className="mt-5 space-y-3">
              {services.map((s) => (
                <li key={s.slug}>
                  <Link
                    href={`/services#${s.slug}`}
                    className="text-[14.5px] leading-snug text-white/75 transition hover:text-gold-300"
                  >
                    {s.title}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Company">
            <h2 className="text-[11.5px] font-bold uppercase tracking-[0.16em] text-white/40">
              Company
            </h2>
            <ul className="mt-5 space-y-3">
              {company.map((c) => (
                <li key={c.href}>
                  <Link
                    href={c.href}
                    className="text-[14.5px] text-white/75 transition hover:text-gold-300"
                  >
                    {c.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <h2 className="text-[11.5px] font-bold uppercase tracking-[0.16em] text-white/40">
              Get in touch
            </h2>
            <ul className="mt-5 space-y-4 text-[14.5px]">
              <li>
                <a
                  href={site.phoneHref}
                  className="text-[19px] font-bold text-white transition hover:text-gold-300"
                >
                  {site.phone}
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${site.email}`}
                  className="text-white/75 transition hover:text-gold-300"
                >
                  {site.email}
                </a>
              </li>
              <li className="text-white/60">{site.hours}</li>
              <li className="not-italic text-white/60">
                <address className="not-italic">
                  {streetLine}
                  <br />
                  {site.address.city}, {site.address.state} {site.address.zip}
                </address>
              </li>
            </ul>
            <Link href="/start" className="btn-gold mt-7 w-full sm:w-auto">
              File My Taxes
            </Link>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex w-full max-w-shell flex-col gap-4 px-5 py-7 text-[13px] text-white/45 sm:px-8 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1.5">
            <p>
              © {year} {site.parentLegalName}. All rights reserved.
            </p>
            {/*
              SmartTaxIQ is a trading name. Stating the parent entity here is
              both the correct legal position and the thing that lets Google
              connect this domain to the Carter Cole profile and its reviews.
            */}
            <p>
              {site.name} is the tax division of{" "}
              <a
                href={site.parentUrl}
                className="text-white/70 underline underline-offset-2 transition hover:text-gold-300"
              >
                {site.parentLegalName}
              </a>
              .
            </p>
          </div>
          <p className="max-w-2xl md:text-right">
            Information on this site is general and does not constitute tax
            advice for your specific situation.
          </p>
        </div>
      </div>
    </footer>
  );
}
