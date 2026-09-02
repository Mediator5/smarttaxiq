"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { daysUntil, deadlines, formatDeadline } from "@/lib/deadlines";
import { site } from "@/lib/site";

/**
 * The thin bar above the header.
 *
 * The next deadline is picked in the browser rather than at build time, so a
 * site that sits unrebuilt for a few months still shows the right one. The
 * first paint uses the earliest future deadline as of the build, which keeps
 * the server and client markup identical and avoids a hydration warning; the
 * countdown number only appears once we're mounted and certain of today's date.
 */
export default function DeadlineStrip() {
  const [index, setIndex] = useState(0);
  const [days, setDays] = useState<number | null>(null);

  useEffect(() => {
    const now = new Date();
    const iso = now.toISOString().slice(0, 10);
    const i = deadlines.findIndex((d) => d.date >= iso);
    if (i >= 0) {
      setIndex(i);
      setDays(daysUntil(deadlines[i].date, now));
    } else {
      setDays(null);
    }
  }, []);

  const next = deadlines[index];
  if (!next) return null;

  return (
    <div className="hidden bg-ink text-white lg:block">
      <div className="mx-auto flex h-10 w-full max-w-[1360px] items-center justify-between px-5 text-[12.5px] sm:px-8">
        <p className="flex items-center gap-2 text-white/65">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-gold-500" />
          <span className="text-white/80">Next federal deadline:</span>
          <Link
            href="/deadlines"
            className="font-semibold text-gold-300 underline-offset-4 hover:underline"
          >
            {next.label}
          </Link>
          <span className="text-white/45">·</span>
          <span className="text-white/60">{formatDeadline(next.date)}</span>
          {days !== null && days >= 0 && (
            <span className="text-white/45">
              ({days === 0 ? "today" : days === 1 ? "1 day" : `${days} days`})
            </span>
          )}
        </p>
        <div className="flex items-center gap-5">
          <a
            href={site.phoneHref}
            className="font-semibold transition hover:text-gold-300"
          >
            {site.phone}
          </a>
          <span className="h-3 w-px bg-white/20" />
          <a
            href={`mailto:${site.email}`}
            className="text-white/75 transition hover:text-gold-300"
          >
            {site.email}
          </a>
        </div>
      </div>
    </div>
  );
}
