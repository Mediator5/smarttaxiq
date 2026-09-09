import type { Metadata } from "next";
import CtaBand from "@/components/CtaBand";
import PostGrid from "@/components/PostGrid";
import Reveal from "@/components/Reveal";
import { PageHero } from "@/components/Section";
import LeadCapture from "@/components/LeadCapture";
import { posts } from "@/lib/posts";

export const metadata: Metadata = {
  title: "Tax Resources",
  description:
    "Plain-language guides on extensions, quarterly payments, 1099 income, IRS notices and the deductions people get wrong.",
  alternates: { canonical: "/resources" },
};

export default function ResourcesPage() {
  const sorted = [...posts].sort((a, b) => (a.date < b.date ? 1 : -1));

  return (
    <>
      <PageHero
        eyebrow="Resources"
        title="Tax explained without the jargon"
        intro="Short, practical guides on the things clients ask about most. No sign-up, no gate — just the answer."
      />

      <section className="py-14 sm:py-16">
        <div className="shell">
          <Reveal>
            <PostGrid posts={sorted} />
          </Reveal>
        </div>
      </section>

      <LeadCapture
        source="resources"
        heading="New articles and tax tips, a few times a year"
        blurb="Plain-English answers to the questions that come up every filing season — sent when they are useful, not on a schedule."
      />

      <CtaBand
        title="Questions the articles don't cover?"
        intro="Call and ask. There's no charge for a question, and no obligation attached to the answer."
        image="lashanda-mug.jpg"
      />
    </>
  );
}
