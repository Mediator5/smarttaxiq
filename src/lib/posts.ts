/**
 * Articles.
 *
 * Add an object here and the index, the category filter, the sitemap and the
 * article route all pick it up. In `body`, a line starting with "## " renders
 * as a heading and a line starting with "- " renders as a bullet.
 */

export type Post = {
  slug: string;
  title: string;
  excerpt: string;
  category: "Filing" | "Self-Employed" | "IRS" | "Planning";
  date: string;
  readMinutes: number;
  image: string;
  body: string;
};

export const posts: Post[] = [
  {
    slug: "what-an-extension-actually-does",
    title: "What a tax extension actually does (and what it doesn't)",
    excerpt:
      "An extension moves your filing deadline six months. It does not move the day your payment is due — and that distinction is where the money is.",
    category: "Filing",
    date: "2026-08-18",
    readMinutes: 5,
    image: "planner-open-pages.jpg",
    body: `Every year people file an extension, breathe out, and assume the whole problem has moved to October. Half of that is right.

An extension is automatic and free. You file one form, you get six more months to submit the return, and no one asks why. For a return that is genuinely not ready — a missing K-1, a business still being reconciled, a year with a move in it — an extension is the correct professional decision, not a confession.

## What it does not do

It does not move your payment date. Whatever you owe for the year is still due on the original deadline, and interest starts running the day after regardless of what you filed.

That is the part people get wrong, and it is expensive because two separate penalties exist:

- **Failure to file** — 5% of the unpaid tax for each month the return is late, up to 25%. This is the big one.
- **Failure to pay** — 0.5% of the unpaid tax for each month it stays unpaid, also capped at 25%.

Look at those two numbers next to each other. Filing late costs ten times as much per month as paying late. That single comparison should decide your behaviour every time.

## So what should you do

If you can't pay, file anyway. Filing on time with a balance you can't cover puts you in the 0.5% lane instead of the 5% lane, and the IRS will almost always accept an installment agreement.

If you can't file, extend and estimate. Send in what you reasonably think you owe with the extension. You don't need to be exact — you need to be close enough that the remaining balance is small, because interest and the failure-to-pay penalty only apply to what's left unpaid.

And if a return has been sitting unfiled for years, that clock never stopped. The good news is that the fix is the same in every case: file the oldest open year first and work forward.

## The quiet cost of waiting

Filing early has one benefit nobody advertises: it blocks refund fraud. A return already on file under your Social Security number means a fraudulent one submitted later gets rejected instead of paid. In a year when someone else has your information, that is the difference between an inconvenience and six months of correspondence.`,
  },
  {
    slug: "1099-vs-w2",
    title: "1099 vs W-2: what changes when nobody withholds",
    excerpt:
      "The same $60,000 produces two very different tax bills depending on which form it arrives on. Here's the arithmetic nobody explains up front.",
    category: "Self-Employed",
    date: "2026-07-22",
    readMinutes: 6,
    image: "lashanda-laptop-laughing.jpg",
    body: `The first year someone goes from a W-2 job to contract work is almost always the year they get a spring surprise. The work feels the same. The money looks better. Then April arrives and there's a number at the bottom of the return that nobody warned them about.

Here's what actually changed.

## Nobody is withholding anything

On a W-2, your employer takes federal tax, state tax, Social Security and Medicare out of every cheque before you see it. By April you have usually overpaid slightly, which is why a refund feels normal.

On a 1099, none of that happens. The full amount lands in your account and every one of those obligations still exists. The money in your account was never entirely yours.

## You now pay both halves of one tax

This is the part that stings. Social Security and Medicare are 15.3% of earnings. As an employee you pay 7.65% and your employer quietly pays the other 7.65%. As a contractor you are both, so you pay the whole 15.3% — on top of regular income tax.

That is self-employment tax, and on $60,000 of net profit it is roughly $8,500 before a dollar of income tax is calculated. You do get to deduct half of it, which softens the blow, but it does not remove it.

## What you get in exchange

Real deductions, ones an employee cannot take at all:

- Mileage driven for work, at the standard rate
- A home office, if a space is used regularly and exclusively for the business
- Equipment, software, phone and internet in proportion to business use
- Professional services, supplies, and business insurance
- Retirement contributions through a SEP-IRA or solo 401(k), which are far larger than an IRA allows

Deductions reduce your net profit, and net profit is what both income tax and self-employment tax are calculated on. Every legitimate expense you fail to record is taxed twice over.

## The fix is quarterly, not annual

The tax system expects to be paid through the year. If you're going to owe meaningfully, you make four estimated payments — and skipping them creates an underpayment penalty even if you pay in full in April.

A workable rule for a first year: set aside 25–30% of every payment you receive in a separate account and don't touch it. Refine that number once you have a return to project from. Getting the habit right in year one matters more than getting the percentage perfect.`,
  },
  {
    slug: "documents-to-gather",
    title: "The documents to gather before you file",
    excerpt:
      "A complete file gets your return finished in days. A partial one turns into three weeks of emails. Here's the full list.",
    category: "Filing",
    date: "2026-06-30",
    readMinutes: 4,
    image: "planner-desk-flatlay.jpg",
    body: `The single biggest cause of a slow return isn't complexity — it's a missing document that nobody notices until the return is half built. Gathering everything first is worth the hour it takes.

## Identity

- Photo ID for you and your spouse
- Social Security or ITIN numbers for everyone on the return, including each dependent
- Last year's return, which tells your preparer what to look for
- Bank routing and account number for direct deposit

## Income

- W-2 from every employer you had during the year, even the one you left in February
- 1099-NEC for contract work, 1099-K from payment platforms
- 1099-INT and 1099-DIV from banks and brokerages
- 1099-G for unemployment
- SSA-1099 for Social Security
- 1099-R for retirement distributions
- Records of any cash income — it is reportable whether or not a form was issued

## Deductions and credits

- 1098 for mortgage interest, 1098-T for tuition, 1098-E for student loan interest
- Childcare provider's name, address and tax ID, plus what you paid
- Charitable donation receipts
- Medical expenses, if they were substantial
- State and local taxes paid
- Property tax bills

## If you're self-employed

- Total income received, by source
- Expenses by category — not a shoebox, a total per category
- Mileage log or at least the year's business miles
- Home office square footage and total home square footage
- Any equipment bought during the year, with dates and amounts

## If anything changed

Tell your preparer about a marriage, a divorce, a birth, a death, a move to another state, a house bought or sold, a business started or closed, or a retirement account cashed out. Each of these changes the return in ways that aren't visible in the documents themselves.

That last list is the one people skip. It is also the one most likely to be worth money.`,
  },
  {
    slug: "irs-letter-arrived",
    title: "An IRS letter arrived. Here's what to do today",
    excerpt:
      "Most notices are proposed adjustments, not accusations — and nearly all of them carry a response window that starts the day they're dated.",
    category: "IRS",
    date: "2026-05-14",
    readMinutes: 5,
    image: "lashanda-desk-writing.jpg",
    body: `The envelope is unsettling. The contents usually aren't as bad as the envelope. But there is one thing you cannot do with it, and that is nothing.

## Open it and find the notice number

Top right corner, something like CP2000 or CP14 or 5071C. That code tells you exactly what this is:

- **CP14** — you owe a balance. The most common notice the IRS sends.
- **CP2000** — income reported to the IRS doesn't match your return. This is a *proposal*, not a bill, and it is frequently wrong or incomplete.
- **5071C** — identity verification. Someone filed a return in your name, or the IRS wants to confirm you filed yours.
- **CP501 / CP503 / CP504** — escalating reminders of an unpaid balance. The 504 is the one that signals collection action.
- **Letter 525 / 566** — examination. This is an actual audit.

## Find the deadline

It's printed on the notice, usually 30 days from the date at the top. That window is the whole game. Responding within it keeps every option open; missing it converts a proposal into an assessment you then have to fight.

## Don't pay it just because it says to

A CP2000 in particular is generated by a computer matching forms against your return. It regularly proposes tax on gross proceeds without accounting for your cost basis, or double-counts income that appeared on two forms. Agreeing to an incorrect notice is expensive and hard to undo.

Read what it says you left out. Check it against your own records. If it's right, agreeing is simple. If it isn't, you respond in writing with documentation.

## What not to do

- Don't ignore it. Interest and penalties keep running, and silence is treated as agreement.
- Don't call the number on an email or text claiming to be the IRS. The IRS opens contact by mail, not by phone, email or text.
- Don't send original documents. Send copies, always.

## Then get help

You can respond yourself, and for a simple balance notice that's often fine. For anything proposing additional tax, having a preparer read the notice, pull your account transcript and write the response is usually worth more than it costs — because the transcript shows what the IRS actually has on file, which is the only reliable basis for an answer.`,
  },
  {
    slug: "quarterly-estimated-payments",
    title: "Quarterly estimated payments, explained properly",
    excerpt:
      "Four dates, one calculation, and a safe harbour rule that removes the guesswork entirely.",
    category: "Planning",
    date: "2026-04-28",
    readMinutes: 5,
    image: "lashanda-legacy-planner.jpg",
    body: `If income arrives without withholding — self-employment, rental property, large investment gains, a pension you set up wrong — the tax system still expects to be paid through the year. Four times a year, in fact.

## The dates aren't quarters

This surprises people. The payment periods are uneven:

- **April 15** covers January through March
- **June 15** covers April and May — two months, not three
- **September 15** covers June through August
- **January 15** of the following year covers September through December

Miss the structure and you'll under-pay in June every year.

## The safe harbour is the useful part

You don't have to predict this year's income correctly. Pay in at least as much as one of these and no underpayment penalty applies, no matter what you end up owing:

- 90% of what you owe for the current year, or
- 100% of what you owed last year — 110% if your income was above $150,000

That second option is the one to use. Last year's number is a known quantity sitting on a return you already filed. Divide it by four, pay that four times, and you have removed the penalty risk from a year whose income you can't yet forecast.

## Paying

Use IRS Direct Pay from your bank account. It's free, it's immediate, and you get a confirmation number — keep it. Your state almost certainly wants its own estimated payments too, on its own schedule.

## If you've already missed one

Pay it now rather than waiting for the next date. The penalty is calculated per period on the amount underpaid, so it accrues from the missed date until you pay. Catching up in September on a payment missed in June costs less than catching up in January.

And if this is the year you discovered any of it, that's normal. The first year of self-employment is the year everybody learns this. The second year is the one where it should be automatic.`,
  },
  {
    slug: "deductions-people-get-wrong",
    title: "Mileage, home office, and the deductions people get wrong",
    excerpt:
      "Three deductions that are worth real money, three that quietly aren't, and the record-keeping that decides which is which.",
    category: "Self-Employed",
    date: "2026-03-19",
    readMinutes: 6,
    image: "lashanda-mug.jpg",
    body: `Deductions are where self-employment stops feeling punitive — but only the ones you can actually substantiate. Here is what holds up.

## Mileage, and why 2026 is unusual

The standard mileage rate changed mid-year in 2026, which is rare. Business miles driven January 1 through June 30 are deducted at 72.5 cents; miles from July 1 through December 31 are deducted at 76 cents. Charitable mileage stayed at 14 cents all year, because that rate is set by statute rather than adjusted for costs.

That mid-year split means your log needs dates, not just a total. Ten thousand miles is worth $7,250 or $7,600 depending on when you drove them.

What counts: travel between job sites, to clients, to the bank for business, to buy supplies. What doesn't: your commute from home to a regular place of work. Though if your home *is* your principal place of business, that first trip of the day becomes deductible — which is one of the quieter benefits of a legitimate home office.

## The home office, done correctly

Two conditions, both required. The space must be used **regularly** and **exclusively** for business. A desk in the corner of a bedroom qualifies if nothing else happens at that desk. A dining table where you also eat dinner does not.

Two methods:

- **Simplified** — $5 per square foot, up to 300 square feet, so $1,500 maximum. No receipts, no depreciation.
- **Actual expenses** — your business-use percentage of rent or mortgage interest, utilities, insurance and repairs. More work, usually more money.

Run both. On a larger home or a higher rent, actual expenses often wins by a wide margin.

## Retirement, the largest one nobody uses

A SEP-IRA lets a self-employed person contribute roughly 20% of net self-employment income, far above an IRA limit. A solo 401(k) can allow more still at moderate income levels. This is the single biggest lever most self-employed filers have, and it is available right up until the filing deadline — meaning it is the rare deduction you can still act on after the year has ended.

## The three that disappoint

- **Clothing** — deductible only if it's unsuitable for everyday wear. A uniform or branded workwear, yes. A suit you bought for client meetings, no.
- **Meals** — 50% deductible, and only with a business purpose and a person on the other side of the table. Lunch alone between jobs isn't deductible.
- **The whole phone bill** — only the business-use percentage, and claiming 100% on your only phone invites a question you'd rather not answer.

## What actually decides it

Records. A deduction you can't substantiate is a deduction you'll lose if anyone asks, and the ones people lose are almost never the ones that were wrong in principle — they're the ones where the log was never kept.

A spreadsheet updated monthly takes about fifteen minutes and is worth more than any clever strategy.`,
  },
];

export const categories = [
  "All",
  "Filing",
  "Self-Employed",
  "IRS",
  "Planning",
] as const;

export function getPost(slug: string) {
  return posts.find((p) => p.slug === slug);
}

export function formatPostDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}
