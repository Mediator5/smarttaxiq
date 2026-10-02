"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import SignOutButton from "./SignOutButton";

/**
 * One navigation bar for every Academy page.
 *
 * Each page used to render its own set of links — the course offered four, the
 * roster offered two, materials offered one, and no two agreed on what to call
 * the same destination ("Instructor view" and "Cohort progress" were the same
 * page). The result moved under you as you clicked, which is exactly the thing
 * that makes software feel untrustworthy to somebody still learning it.
 *
 * Now the set is fixed for the whole visit and the current page is marked
 * rather than removed. You always know where you are and what else exists.
 *
 * Students see the two destinations that are theirs. The instructor links are
 * absent, not disabled — a greyed-out control invites someone to wonder what
 * they are missing.
 */

type Item = { href: string; label: string; instructorOnly?: boolean };

const ITEMS: Item[] = [
  { href: "/academy", label: "Course" },
  { href: "/academy/instructor", label: "Progress", instructorOnly: true },
  { href: "/academy/teaching", label: "Teaching", instructorOnly: true },
  { href: "/academy/roster", label: "Roster", instructorOnly: true },
  { href: "/academy/materials", label: "Materials" },
];

export default function AcademyNav({
  role,
  pendingRequests = 0,
}: {
  role: "student" | "instructor";
  /** Shown as a count beside Roster, so a waiting request is visible from
   *  anywhere rather than only on the page that lists it. */
  pendingRequests?: number;
}) {
  const pathname = usePathname();
  const items = ITEMS.filter((i) => !i.instructorOnly || role === "instructor");

  return (
    <nav
      aria-label="Academy"
      className="flex flex-wrap items-center gap-x-5 gap-y-2"
    >
      {items.map((item) => {
        // Exact match only: /academy must not light up on /academy/roster.
        const current = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={current ? "page" : undefined}
            className={
              current
                ? "border-b-2 border-gold-500 pb-0.5 text-[14.5px] font-bold text-ink"
                : "border-b-2 border-transparent pb-0.5 text-[14.5px] font-semibold text-ink/55 transition hover:border-ink/15 hover:text-ink"
            }
          >
            {item.label}
            {item.href === "/academy/roster" && pendingRequests > 0 && (
              <span className="ml-2 rounded-full bg-gold-100 px-2 py-0.5 text-[11.5px] font-bold text-gold-700">
                {pendingRequests}
              </span>
            )}
          </Link>
        );
      })}

      <span className="ml-1 h-4 w-px bg-ink/15" aria-hidden="true" />
      <SignOutButton />
    </nav>
  );
}
