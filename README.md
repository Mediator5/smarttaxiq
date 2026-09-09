# SmartTaxIQ

A standalone Next.js 14 site for **smarttaxiq.com**.

This project is entirely separate from the Carter Cole & Associates site — its
own folder, own repository, own domain, own brand. Nothing is shared between
them and neither one imports from the other.

---

## Running it

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
npm start        # serve the production build
```

Node 18.17 or newer. No database, no native modules, nothing to compile.

---

## Pages

| Route | Page |
| --- | --- |
| `/` | Home |
| `/services` | Six tax services in detail |
| `/process` | How it works, step by step |
| `/pricing` | Flat-fee ranges and add-ons |
| `/start` | Start your return — both JotForm intake forms |
| `/deadlines` | Federal tax calendar through 2027 + key figures |
| `/resources` | Article index with category filter |
| `/resources/[slug]` | Six articles |
| `/faq` | Grouped FAQ with schema markup |
| `/about` | Lashanda Carter and how the practice works |
| `/contact` | Contact form and details |

22 routes are generated at build time, so the site is static and fast by
default. Only `/api/contact` runs on request.

---

## Before it goes live

### 1. Email address

`src/lib/site.ts` → `site.email` is `info@smarttaxiq.com`. Make sure that
mailbox exists on the domain before launch — it appears in the header, footer,
contact page and schema markup.

### 2. The street address — done

`src/lib/site.ts` → `site.address` is set to
**14701 Mack Ave, Suite B, Detroit, MI 48215**, and flows from there into the
footer, the contact page, email footers and the local-business schema.

It must stay character-identical to the Carter Cole site and to the Google
Business Profile — mismatched name/address/phone measurably suppresses local
ranking.

### 3. Contact form delivery — done

`src/app/api/contact/route.ts` used to validate a submission, log a line and
throw it away: anyone who used the form left no record anywhere. It now stores
the message, alerts the office by email and SMS, sends the visitor an
acknowledgement, and adds them to the mailing list if they ticked the box.

Mail goes over Resend's HTTPS API rather than SMTP — serverless hosts routinely
block outbound SMTP, and a hanging mail host stalls a form submission until the
platform kills it. Set `RESEND_API_KEY` and `MAIL_FROM`; see
[`LEAD-SYSTEM-SETUP.md`](./LEAD-SYSTEM-SETUP.md).

---

## The lead system

This site and the Carter Cole site feed one Mailchimp audience and one set of
instant alerts. The list layer has two interchangeable backends — Mailchimp and
Resend — and uses whichever is configured, so changing campaign tools is an
environment change rather than a code change. Everything is credential-gated: with nothing configured the
site runs exactly as before, and each value added switches on one more part of
it with no code change.

| Piece | Where |
| --- | --- |
| Email capture (every major page) | `src/components/LeadCapture.tsx` |
| Capture endpoint | `POST /api/subscribe` |
| Contact form | `POST /api/contact` |
| JotForm intake webhook | `POST /api/webhooks/jotform` |
| Calendly booking webhook | `POST /api/webhooks/calendly` |
| Mailing list (Mailchimp) | `src/lib/audience/` |
| Email + SMS alerts | `src/lib/notify.ts` |
| Optional shared storage | `src/lib/store.ts` |
| One capture path for all of it | `src/lib/leads.ts` |
| Analytics, attribution, conversions | `src/lib/analytics.ts` |
| Sticky mobile call bar | `src/components/StickyCallBar.tsx` |

**Setup, value by value: [`LEAD-SYSTEM-SETUP.md`](./LEAD-SYSTEM-SETUP.md).**

These files are deliberate copies of their equivalents on the Carter Cole
project rather than a shared package. The two repositories stay independent and
neither imports the other; what they share is the destination — the same
Mailchimp audience, the same alert recipients, and optionally the same Supabase
project — so they meet at the data rather than in the code.

`src/lib/store.ts` is the one genuinely optional piece, and it is pointed at
**the Carter Cole project** — the two websites deliberately share one database.

That is not laziness, it is the point. `email` is unique per Supabase project,
so a shared database means someone who takes the checklist on one site and
files through the other is one person with one row and one token, rather than
two records that never reconcile. It also means the admin dashboard on the
Carter Cole site lists every lead from both brands, with `source` telling them
apart — one place to look instead of two, which is the entire reason the lead
system exists.

There is no `supabase/` folder here on purpose. The schema lives in the Carter
Cole project (`supabase/schema.sql`) and is applied once; a second copy in this
repository would be a second thing to edit and a guaranteed source of drift
between two codebases pointing at the same tables.

Leave `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` blank and this site simply
keeps no database, exactly as it did before — leads still reach Mailchimp and
still raise an alert.

---

## The intake forms

Both JotForms are live and embedded on `/start` behind a Personal / Business
switcher:

- Personal — `https://form.jotform.com/253275423934056`
- Business — `https://form.jotform.com/253285600052550`

They're in `src/lib/site.ts` under `site.jotform`. The iframe is always
mounted with the loading panel layered over it, so a missed load event can't
strand anyone on a spinner, and there's an "open in a new tab" fallback either
way.

---

## Content you'll want to edit

| What | Where |
| --- | --- |
| Phone, email, hours, city | `src/lib/site.ts` |
| Services | `src/lib/site.ts` → `services` |
| Testimonials | `src/lib/site.ts` → `testimonials` |
| Pricing tiers and add-ons | `src/lib/pricing.ts` |
| FAQ | `src/lib/faq.ts` |
| Articles | `src/lib/posts.ts` |
| Tax deadlines and figures | `src/lib/deadlines.ts` |

Adding an article is one object in the `posts` array — the index, the category
filter, the sitemap and the article route all pick it up automatically. In an
article body, a line starting with `## ` is a heading, a line starting with
`- ` is a bullet, and `**text**` is bold.

### Updating the deadlines once a year

`src/lib/deadlines.ts` holds dates as ISO strings, so the page sorts them and
the header strip finds the next one without anyone re-typing anything. Replace
the past year's entries each January and the site follows.

Everything in that file was verified against IRS guidance in September 2026 —
including the mid-year 2026 mileage change (72.5¢ through June 30, 76¢ from
July 1), which is unusual and easy to get wrong.

---

## Design

| Token | Value | Use |
| --- | --- | --- |
| Ink | `#081840` | Headings, dark sections, footer |
| Gold | `#d8b038` | The primary brand colour and every CTA |
| Mint | `#10a878` | Ticks, confirmations |
| Ice | `#f2f5fa` | Alternating section backgrounds |

All three were sampled from the SmartTaxIQ logo artwork itself, so the site
matches the brand exactly. Gold leads here rather than sitting in a supporting
role — that's the main thing that makes this read as its own brand rather than
a variation on anything else.

Typography is **Plus Jakarta Sans** for headings and **Inter** for body, both
self-hosted through `@fontsource`. There is no Google Fonts request, so nothing
external can slow the page down or break behind a privacy blocker.

Numbers render with lining, tabular figures everywhere — on a site this full of
dates and dollar amounts, the default proportional figures look wrong.

---

## SEO

- Per-page titles, descriptions and canonical URLs on `smarttaxiq.com`
- `AccountingService` JSON-LD with the service catalogue, plus `FAQPage`
  schema on `/faq` and `Article` schema on each post
- Auto-generated `sitemap.xml` and `robots.txt`
- Redirects in `next.config.mjs` for the old SmartTaxIQ URLs — `/get-started`,
  `/how-it-works`, `/blog`, `/faqs`, `/about-us`, `/tax-calendar` and others —
  so nothing that's already indexed 404s
- Skip link, semantic headings, alt text, and `prefers-reduced-motion` honoured

---

## Deploying to smarttaxiq.com

Vercel is the simplest path: push the repo, import it, add `smarttaxiq.com` as
a custom domain, done. There's no database and nothing writes to disk, so the
serverless model is a clean fit here — unlike the funnel on the other site.

Any Node host also works with `npm run build && npm start`.

Whichever you choose, update `site.url` in `src/lib/site.ts` if the canonical
domain ever changes — it feeds canonical tags, OpenGraph, the sitemap and
robots.txt from that one value.

---

## Verified

- Production build clean: 22 routes, no TypeScript or ESLint errors
- No horizontal overflow at 1440, 1366, 1280, 1024, 768 and 390 px on every
  page
- All 16 internal links resolve; the legacy redirects all return 308 to a real
  page
- Both JotForms load in the switcher and the loading overlay clears
- Deadline dates cross-checked against the calendar (weekday names included)
  and against IRS guidance
#   s m a r t t a x i q 
 
 