/**
 * Federal tax deadlines.
 *
 * Sources (verified September 2026):
 *  - Estimated payment dates: IRS via Kiplinger's estimated-tax calendar
 *  - 2027 individual and business due dates: IRS filing-season guidance,
 *    Jackson Hewitt and Reed CPA 2026–2027 due-date tables
 *  - Standard deduction: IRS Rev. Proc. inflation adjustments for TY2026
 *  - Mileage: IRS standard mileage rates page (note the mid-year 2026 change)
 *
 * `date` is ISO so the page can sort and highlight what's next without
 * anyone re-typing a date. Update once a year.
 */

export type Deadline = {
  date: string;
  label: string;
  detail: string;
  who: "individual" | "business" | "both";
};

export const deadlines: Deadline[] = [
  {
    date: "2026-09-15",
    label: "Q3 estimated payment due",
    detail:
      "Covers income earned June 1 – August 31, 2026. Also the extended deadline for 2025 partnership and S-corp returns.",
    who: "both",
  },
  {
    date: "2026-10-15",
    label: "Extended 2025 individual returns due",
    detail:
      "The last day to file a 2025 return that went on extension. There is no further extension after this.",
    who: "individual",
  },
  {
    date: "2026-12-31",
    label: "Last day for 2026 tax moves",
    detail:
      "Retirement contributions to an employer plan, charitable giving, equipment purchases and income timing all have to land on or before this date to count for 2026.",
    who: "both",
  },
  {
    date: "2027-01-15",
    label: "Q4 estimated payment due",
    detail:
      "Covers September 1 – December 31, 2026. You can skip it if you file your full 2026 return and pay the balance by February 1, 2027.",
    who: "both",
  },
  {
    date: "2027-02-01",
    label: "W-2s and 1099-NECs due",
    detail:
      "Employers and payers must issue these to recipients and file them with the IRS and SSA. The usual January 31 date moves to February 1 because the 31st is a Sunday.",
    who: "business",
  },
  {
    date: "2027-03-15",
    label: "Partnership and S-corp returns due",
    detail:
      "Forms 1065 and 1120-S for tax year 2026, or Form 7004 for an extension to September 15, 2027. This falls a month before your personal return so your K-1 reaches you in time.",
    who: "business",
  },
  {
    date: "2027-04-15",
    label: "Tax Day — 2026 returns due",
    detail:
      "Individual returns (Form 1040) and C-corporation returns (Form 1120). Also the deadline for 2026 IRA and HSA contributions, and the Q1 2027 estimated payment. An extension gives you until October 15 to file, but any tax owed is still due today.",
    who: "both",
  },
  {
    date: "2027-06-15",
    label: "Q2 2027 estimated payment due",
    detail: "Covers income earned April 1 – May 31, 2027.",
    who: "both",
  },
  {
    date: "2027-09-15",
    label: "Extended business returns due",
    detail:
      "Final deadline for 2026 partnership and S-corp returns that went on extension. Also the Q3 2027 estimated payment.",
    who: "business",
  },
  {
    date: "2027-10-15",
    label: "Extended individual returns due",
    detail:
      "Final deadline for 2026 individual returns on extension, and for extended C-corporation returns.",
    who: "both",
  },
];

/** Figures people search for, kept in one place so they're easy to update. */
export const keyFigures = [
  {
    label: "Standard deduction, single",
    value: "$16,100",
    note: "Tax year 2026",
  },
  {
    label: "Standard deduction, married filing jointly",
    value: "$32,200",
    note: "Tax year 2026",
  },
  {
    label: "Standard deduction, head of household",
    value: "$24,150",
    note: "Tax year 2026",
  },
  {
    label: "Business mileage, Jan 1 – Jun 30, 2026",
    value: "72.5¢",
    note: "Per mile",
  },
  {
    label: "Business mileage, Jul 1 – Dec 31, 2026",
    value: "76¢",
    note: "Per mile — the IRS raised it mid-year",
  },
  {
    label: "Charitable mileage, all of 2026",
    value: "14¢",
    note: "Per mile — set by statute, does not change",
  },
];

/** The next deadline on or after `today`, for the banner on the deadlines page. */
export function nextDeadline(today = new Date()): Deadline | null {
  const iso = today.toISOString().slice(0, 10);
  return deadlines.find((d) => d.date >= iso) ?? null;
}

export function formatDeadline(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function daysUntil(iso: string, today = new Date()): number {
  const [y, m, d] = iso.split("-").map(Number);
  const target = Date.UTC(y, m - 1, d);
  const now = Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate()
  );
  return Math.round((target - now) / 86400000);
}
