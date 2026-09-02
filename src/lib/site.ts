/**
 * Every piece of business information the site renders comes from this file.
 * Change it here and the header, footer, contact page, schema markup and
 * sitemap all follow.
 */

export const site = {
  name: "SmartTaxIQ",
  tagline: "Smarter tax. Clearer answers.",
  description:
    "Licensed tax preparation, year-round planning and IRS notice help for individuals, freelancers and small businesses. File remotely from anywhere in the U.S.",
  url: "https://smarttaxiq.com",

  /** The year Lashanda started preparing returns. Drives “X years” on the site. */
  founded: 2003,

  preparer: {
    name: "Lashanda Carter",
    role: "Founder & Lead Tax Preparer",
  },

  phone: "810-493-6605",
  phoneHref: "tel:+18104936605",
  email: "info@smarttaxiq.com",

  city: "Detroit, Michigan",
  address: {
    street: "[Address to be confirmed]",
    city: "Detroit",
    state: "MI",
    zip: "[ZIP]",
    country: "US",
  },

  hours: "Monday – Thursday, 9:30am – 5:00pm ET",
  seasonHours: "January – April: extended hours, including Saturdays",

  /** Live JotForm intake forms. */
  jotform: {
    personal: "https://form.jotform.com/253275423934056",
    business: "https://form.jotform.com/253285600052550",
  },
} as const;

export const nav = [
  { href: "/services", label: "Services" },
  { href: "/process", label: "How It Works" },
  { href: "/pricing", label: "Pricing" },
  { href: "/deadlines", label: "Deadlines" },
  { href: "/resources", label: "Resources" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
] as const;

export type Service = {
  slug: string;
  title: string;
  short: string;
  body: string;
  bullets: string[];
  who: string;
};

export const services: Service[] = [
  {
    slug: "individual-tax-returns",
    title: "Individual Tax Returns",
    short:
      "W-2 income, multiple jobs, a new baby, a new state — filed accurately and explained plainly.",
    body: "Most people don't need a complicated return. They need someone who will actually look at it. We check filing status, credits you may have missed, and whether anything from last year is still costing you — then file federal, state and local together.",
    bullets: [
      "Federal, state and local returns",
      "Multi-state and part-year filings",
      "Earned Income, Child Tax and education credits",
      "Filing-status review for single parents and separated couples",
      "Direct-deposit refund tracking",
    ],
    who: "Employees, families, students, retirees",
  },
  {
    slug: "self-employed-1099",
    title: "Self-Employed & 1099 Filing",
    short:
      "Contract work, gig income and side businesses, with the deductions that belong to you.",
    body: "A 1099 means nobody withheld anything on your behalf, and self-employment tax surprises people every spring. We build the Schedule C properly — real expenses, real mileage, real home-office math — and set up quarterly payments so next April is a formality.",
    bullets: [
      "Schedule C preparation",
      "1099-NEC, 1099-K and cash income",
      "Mileage, home office and equipment deductions",
      "Self-employment tax calculation",
      "Quarterly estimated payment schedule",
    ],
    who: "Drivers, stylists, contractors, creators, consultants",
  },
  {
    slug: "small-business-returns",
    title: "Small Business Returns",
    short:
      "LLC, S-corp, partnership and corporate returns, filed on time with K-1s in hand.",
    body: "Pass-through returns are due a month before your personal one, because your K-1 has to reach you first. We work to that calendar, reconcile the books against the return before filing, and flag anything about your structure that is costing you money.",
    bullets: [
      "Forms 1065, 1120 and 1120-S",
      "K-1 preparation and distribution",
      "S-corp reasonable compensation review",
      "Depreciation and asset schedules",
      "Year-end reconciliation before filing",
    ],
    who: "LLCs, S-corps, partnerships, corporations",
  },
  {
    slug: "tax-planning",
    title: "Year-Round Tax Planning",
    short:
      "The decisions that lower a tax bill are made before December, not in April.",
    body: "By the time a return is prepared, most of the outcome is already fixed. Planning is the other conversation — entity elections, retirement contributions, timing of income and equipment purchases, withholding adjustments — held while there is still time to act on it.",
    bullets: [
      "Mid-year projection and withholding check",
      "Entity election analysis (LLC vs S-corp)",
      "Retirement contribution strategy",
      "Income and expense timing",
      "Written plan with deadlines",
    ],
    who: "Anyone surprised by a tax bill",
  },
  {
    slug: "amended-returns",
    title: "Prior-Year & Amended Returns",
    short:
      "Unfiled years brought current, and past mistakes corrected — often for a refund.",
    body: "Unfiled returns don't age out, and a return prepared badly can usually be fixed. We look back three years as a matter of course, because refunds are still claimable in that window and missed credits are common.",
    bullets: [
      "Unfiled prior-year returns",
      "Form 1040-X amended returns",
      "Three-year lookback for missed credits",
      "Wage and income transcript retrieval",
      "Refund recovery on returns filed elsewhere",
    ],
    who: "Anyone behind on filing",
  },
  {
    slug: "irs-notices",
    title: "IRS Notices & Letters",
    short:
      "A letter from the IRS is a deadline, not a verdict. We answer it for you.",
    body: "CP2000, CP14, identity verification, an examination letter — each has a response window and a correct reply. We read the notice, pull the transcript, and respond in writing on your behalf. Ignoring one is what turns a small problem into a lien.",
    bullets: [
      "Notice interpretation and transcript review",
      "Written response and documentation",
      "Identity verification (5071C) support",
      "Payment plans and installment agreements",
      "Penalty abatement requests",
    ],
    who: "Anyone with an IRS letter",
  },
];

export const testimonials = [
  {
    quote:
      "She helped me take my credit score from 420 to 740 in just a few months — and went back to fix my taxes from previous years too. She filed my amendments, found deductions I didn't even know I missed, and made sure I got the max return.",
    name: "T. Gardner",
    detail: "Amended returns",
  },
  {
    quote:
      "Lashanda's been doing my taxes for years and I trust her completely. She breaks everything down so it's easy to understand and never misses a detail.",
    name: "J. Owens",
    detail: "Individual filing",
  },
  {
    quote:
      "I was going through a rough time and everything felt overwhelming. She took it off my plate, explained where I stood, and I finally stopped avoiding the mail.",
    name: "Tinka Cox",
    detail: "Prior-year filing",
  },
];
