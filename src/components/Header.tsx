"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { nav, site } from "@/lib/site";
import DeadlineStrip from "./DeadlineStrip";
import Logo from "./Logo";

export default function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-50">
      <DeadlineStrip />

      <div
        className={`border-b bg-white transition-all duration-300 ${
          scrolled
            ? "border-ink/10 shadow-[0_10px_30px_-26px_rgba(8,24,64,0.7)]"
            : "border-ink/[0.07]"
        }`}
      >
        <div className="mx-auto flex h-[72px] w-full max-w-[1360px] items-center justify-between gap-4 px-5 sm:px-8">
          <Link
            href="/"
            aria-label={`${site.name} — home`}
            className="shrink-0"
          >
            <Logo width={172} priority className="w-[148px] sm:w-[172px]" />
          </Link>

          <nav
            className="hidden items-center gap-0.5 min-[1120px]:flex"
            aria-label="Primary"
          >
            {nav.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`relative whitespace-nowrap rounded-lg px-3 py-2 text-[13.5px] font-semibold transition ${
                    active
                      ? "text-ink"
                      : "text-ink/60 hover:bg-ink-50 hover:text-ink"
                  }`}
                >
                  {item.label}
                  {active && (
                    <span className="absolute inset-x-3 -bottom-[3px] h-[3px] rounded-full bg-gold-500" />
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href="/start"
              className="btn-gold hidden whitespace-nowrap px-5 py-2.5 text-[13.5px] sm:inline-flex"
            >
              File My Taxes
            </Link>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              aria-controls="mobile-menu"
              className="flex h-11 w-11 items-center justify-center rounded-lg border border-ink/15 text-ink transition hover:border-ink/40 min-[1120px]:hidden"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
                {open ? (
                  <path
                    d="M6 6l12 12M18 6L6 18"
                    stroke="currentColor"
                    strokeWidth="1.9"
                    strokeLinecap="round"
                  />
                ) : (
                  <path
                    d="M4 7h16M4 12h16M4 17h16"
                    stroke="currentColor"
                    strokeWidth="1.9"
                    strokeLinecap="round"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile drawer */}
      <div
        id="mobile-menu"
        className={`fixed inset-x-0 bottom-0 top-[72px] z-40 overflow-y-auto bg-white transition-all duration-300 min-[1120px]:hidden ${
          open
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none -translate-y-2 opacity-0"
        }`}
      >
        <div className="shell flex flex-col py-5">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center justify-between border-b border-ink/[0.08] py-4 text-[17px] font-semibold text-ink"
            >
              {item.label}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M9 6l6 6-6 6"
                  stroke="#d8b038"
                  strokeWidth="1.9"
                  strokeLinecap="round"
                />
              </svg>
            </Link>
          ))}
          <Link
            href="/faq"
            className="flex items-center justify-between border-b border-ink/[0.08] py-4 text-[17px] font-semibold text-ink"
          >
            FAQ
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M9 6l6 6-6 6"
                stroke="#d8b038"
                strokeWidth="1.9"
                strokeLinecap="round"
              />
            </svg>
          </Link>

          <div className="mt-6 grid gap-3 pb-8">
            <Link href="/start" className="btn-gold w-full">
              File My Taxes
            </Link>
            <a href={site.phoneHref} className="btn-outline w-full">
              Call {site.phone}
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}
