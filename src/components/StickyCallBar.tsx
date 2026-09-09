"use client";

import { useEffect, useState } from "react";
import { site } from "@/lib/site";
import { trackConversion } from "@/lib/analytics";

/**
 * Sticky call bar — phones only, every page.
 *
 * Tax clients call. They are standing in a kitchen holding a letter from the
 * IRS, on a phone, and the distance between that moment and a conversation
 * should be one thumb-reach — not a scroll to the footer to hunt for a number.
 * This is the single highest-leverage mobile conversion element on the site,
 * which is why it is always present rather than only in the header.
 *
 * Two details that stop it being annoying:
 *
 *   - It waits until the visitor has scrolled a little, so it never covers
 *     the hero on arrival.
 *   - It hides itself when a form field has focus, so it cannot sit on top of
 *     the keyboard or the submit button someone is trying to reach — the
 *     classic way a sticky bar quietly destroys the conversions it was added
 *     to create.
 *
 * `lg:hidden` keeps it off desktop entirely, and `pb-safe` respects the home
 * indicator on iPhones.
 */
export default function StickyCallBar() {
  const [visible, setVisible] = useState(false);
  const [typing, setTyping] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 260);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    const isField = (el: EventTarget | null) =>
      el instanceof HTMLElement &&
      ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName);

    const onFocus = (e: FocusEvent) => {
      if (isField(e.target)) setTyping(true);
    };
    const onBlur = (e: FocusEvent) => {
      if (isField(e.target)) setTyping(false);
    };

    document.addEventListener("focusin", onFocus);
    document.addEventListener("focusout", onBlur);

    return () => {
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("focusin", onFocus);
      document.removeEventListener("focusout", onBlur);
    };
  }, []);

  const shown = visible && !typing;

  return (
    <>
      {/*
        Spacer so the bar never covers the last line of the footer. It only
        occupies space once the bar is actually on screen.
      */}
      <div
        aria-hidden
        className={`lg:hidden ${shown ? "h-[76px]" : "h-0"} transition-[height] duration-200`}
      />

      <div
        className={`fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-ink/95 px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 backdrop-blur transition-transform duration-300 lg:hidden ${
          shown ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-gold-400">
              Talk to a preparer
            </p>
            <p className="truncate text-[13px] text-white/60">
              {site.hours.replace("Monday – Thursday, ", "Mon–Thu ")}
            </p>
          </div>

          <a
            href={site.phoneHref}
            onClick={() =>
              trackConversion("phone_click", {
                source: "sticky-bar",
                page:
                  typeof window !== "undefined"
                    ? window.location.pathname
                    : "",
              })
            }
            className="flex shrink-0 items-center gap-2 rounded-lg bg-gold-500 px-5 py-3 text-[15px] font-extrabold text-ink transition active:scale-[0.98]"
          >
            <svg
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden
            >
              <path
                d="M6.6 10.8a15.1 15.1 0 006.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1A17 17 0 013 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.2.2 2.4.6 3.6.1.3 0 .7-.2 1l-2.3 2.2z"
                fill="currentColor"
              />
            </svg>
            {site.phone}
          </a>
        </div>
      </div>
    </>
  );
}
