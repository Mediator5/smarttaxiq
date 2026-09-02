export type QA = { q: string; a: string };
export type FaqGroup = { title: string; items: QA[] };

export const faqGroups: FaqGroup[] = [
  {
    title: "Working with us",
    items: [
      {
        q: "Do I have to come into an office?",
        a: "No. Everything can be done remotely — the intake form, document upload, the review call and the signature. Clients in all 50 states file with us this way. If you're local to Detroit and would rather sit down in person, that can be arranged during filing season.",
      },
      {
        q: "How long does a return take?",
        a: "Once we have complete documents, a straightforward individual return is usually ready for your review within three to five business days. Business returns and returns with rental property, multiple states or missing prior years take longer. During the last two weeks before a deadline, everything takes longer — filing early is the cheapest thing you can do.",
      },
      {
        q: "What do I need to send you?",
        a: "Photo ID, Social Security numbers for everyone on the return, all income documents (W-2, 1099-NEC, 1099-K, 1099-INT, SSA-1099), last year's return, and records for anything you want to deduct. If you're self-employed, bring your income and expense totals. The intake form walks you through it and you can upload as you go.",
      },
      {
        q: "Can you file if I'm missing a document?",
        a: "Often, yes. We can pull your IRS wage and income transcript, which shows most of what was reported under your Social Security number. It doesn't include everything — cash income and some state items won't appear — but it's usually enough to file accurately rather than guess.",
      },
      {
        q: "Do you handle state returns too?",
        a: "Yes, including multi-state and part-year returns if you moved or worked across state lines. Each additional state is quoted separately because each one is genuine additional work.",
      },
    ],
  },
  {
    title: "Cost and payment",
    items: [
      {
        q: "How much does it cost?",
        a: "You get a flat quote before any work starts, based on what your return actually involves. There is no charge for the conversation that produces the quote. Our pricing page lists typical ranges so you can see roughly where you'll land before you call.",
      },
      {
        q: "Can the fee come out of my refund?",
        a: "In many cases yes, through a refund transfer arrangement with the bank that processes it. That option carries a bank fee of its own, so we'll show you both numbers and let you choose. Paying up front is always the cheaper of the two.",
      },
      {
        q: "What if my return turns out to be more complicated than I said?",
        a: "We re-quote before doing the extra work, not after. You will never receive an invoice larger than the number you agreed to without having agreed to the new one first.",
      },
    ],
  },
  {
    title: "Refunds and the IRS",
    items: [
      {
        q: "When will I get my refund?",
        a: "The IRS issues most refunds within 21 days of accepting an e-filed return with direct deposit. Returns claiming the Earned Income Credit or Additional Child Tax Credit are held by law until mid-February regardless of when you filed. You can track yours with the IRS 'Where's My Refund' tool 24 hours after we file.",
      },
      {
        q: "Can you guarantee a bigger refund?",
        a: "No, and you should be wary of anyone who does. Your refund is determined by your income, withholding and the credits you actually qualify for. What we can promise is that nothing you qualify for gets missed and nothing you don't qualify for gets claimed — the second half is what keeps you out of trouble.",
      },
      {
        q: "I got a letter from the IRS. What now?",
        a: "Don't ignore it, and don't panic. Most notices are proposed adjustments, not accusations, and most have a 30-day response window printed on them. Send us the notice and we'll read it, pull your transcript, and respond in writing on your behalf.",
      },
      {
        q: "I haven't filed in a few years. Am I in trouble?",
        a: "Usually less than you fear. Unfiled returns don't expire, and the IRS generally wants the returns more than it wants to penalize you. We file the oldest open years first, because refunds are only claimable for three years and there may be money waiting. If a balance is owed, an installment agreement is normally available.",
      },
      {
        q: "What happens if I'm audited?",
        a: "We stand behind the returns we prepare. If a return we filed is examined, we'll explain what's being asked, help you assemble the documentation, and correspond with the IRS on your behalf. Representation in a full field examination is quoted separately.",
      },
    ],
  },
  {
    title: "Deadlines and extensions",
    items: [
      {
        q: "What if I can't file by the deadline?",
        a: "File an extension — it's free and automatic, and it moves your filing deadline six months. The thing extensions do not move is payment. Anything you owe is still due on the original date, and interest runs from that date whether you filed or not. So estimate, pay what you can, and file the extension.",
      },
      {
        q: "Do I need to make quarterly payments?",
        a: "If you're self-employed or have significant income nobody withholds from, generally yes — the tax system expects payment through the year, not in one lump. We calculate the four amounts for you and give you the dates. Skipping them creates an underpayment penalty even if you pay in full in April.",
      },
      {
        q: "When can I file for the year?",
        a: "The IRS opens e-filing in late January and announces the exact date in early January. Filing in the first weeks of the season is the single best defence against refund fraud, because a return already on file blocks a fraudulent one.",
      },
    ],
  },
];

export const allFaqs: QA[] = faqGroups.flatMap((g) => g.items);
