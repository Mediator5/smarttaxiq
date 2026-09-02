/**
 * Indicative pricing.
 *
 * These are ranges, not a rate card — every engagement is quoted before work
 * starts. Edit the numbers here and the pricing page follows.
 */

export type Tier = {
  name: string;
  price: string;
  unit: string;
  summary: string;
  includes: string[];
  best?: boolean;
  note?: string;
};

export const tiers: Tier[] = [
  {
    name: "Simple return",
    price: "$150",
    unit: "starting at",
    summary:
      "One or two W-2s, the standard deduction, no business income. Filed federal and state.",
    includes: [
      "Federal and one state return",
      "Standard deduction and common credits",
      "Prior-year return reviewed for missed items",
      "E-file with direct deposit",
      "A call to walk through the numbers",
    ],
  },
  {
    name: "Self-employed",
    price: "$325",
    unit: "starting at",
    summary:
      "1099 income, gig work or a side business. Schedule C, deductions and a quarterly plan.",
    includes: [
      "Everything in Simple return",
      "Schedule C preparation",
      "Mileage, home office and equipment deductions",
      "Self-employment tax calculation",
      "Next year's quarterly payment schedule",
    ],
    best: true,
  },
  {
    name: "Business return",
    price: "$650",
    unit: "starting at",
    summary:
      "An entity return — 1065, 1120 or 1120-S — with K-1s prepared and distributed.",
    includes: [
      "Federal and one state entity return",
      "K-1 preparation for each owner",
      "Book-to-return reconciliation",
      "Depreciation schedule maintained",
      "Reasonable compensation review for S-corps",
    ],
  },
];

export const addOns = [
  { item: "Each additional state", price: "$75" },
  { item: "Rental property (per property)", price: "$95" },
  { item: "Prior-year or amended return", price: "from $175" },
  { item: "IRS notice response", price: "from $250" },
  { item: "Tax planning session with written plan", price: "$350" },
  { item: "Extension filing (existing clients)", price: "No charge" },
];

export const pricingPrinciples = [
  {
    title: "Quoted before we start",
    body: "You get a number in writing after we've seen what your return involves. If the scope changes, we re-quote before doing the work — never after.",
  },
  {
    title: "No percentage of your refund",
    body: "Our fee is based on the work, not on what the IRS sends you. Anyone charging a share of your refund has an incentive that isn't yours.",
  },
  {
    title: "The consultation is free",
    body: "The conversation where we work out what you need and what it costs doesn't carry a charge, whether or not you go ahead.",
  },
];
