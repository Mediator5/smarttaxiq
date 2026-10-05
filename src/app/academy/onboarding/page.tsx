import { notFound } from "next/navigation";
import AcademyNav from "@/components/academy/AcademyNav";
import { currentStudent, sessionSecretConfigured } from "@/lib/academy/auth";
import {
  academyConfigured,
  getOnboarding,
  getPendingAccessRequests,
  getRoster,
  getSetting,
} from "@/lib/academy/store";
import OnboardingTracker from "@/components/academy/OnboardingTracker";
import StaffSignIn from "@/components/academy/StaffSignIn";

/**
 * Who is cleared to prepare returns under the practice's PTIN.
 *
 * Separate from the Roster, which is about who may take the course. A trainee
 * and a preparer are different relationships with the practice, and plenty of
 * people will be one without being the other — so they get different pages
 * rather than one page with two meanings.
 *
 * Instructor-gated, 404 for everyone else, like the rest of the staff side.
 */
export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  if (!academyConfigured() || !sessionSecretConfigured()) notFound();

  const viewer = await currentStudent();
  // Signed out is a different situation from signed in as a trainee, and the
  // two get different answers — see the note in StaffSignIn.
  if (!viewer) return <StaffSignIn area="preparer paperwork" />;
  if (viewer.role !== "instructor") notFound();

  const [rows, roster, requests, planUrl] = await Promise.all([
    getOnboarding(),
    getRoster(),
    getPendingAccessRequests(),
    getSetting("security_plan_url"),
  ]);

  // Roster members not already on the checklist, so adding a graduate is one
  // click. Withdrawn students are included on purpose: finishing the course
  // and then being hired is a perfectly ordinary sequence.
  const tracked = new Set(rows.map((r) => r.email));
  const rosterSuggestions = roster
    .filter((p) => !tracked.has(p.email))
    .map((p) => ({
      email: p.email,
      first_name: p.first_name,
      last_name: p.last_name,
    }));

  return (
    <section className="py-10 sm:py-14">
      <div className="shell max-w-[900px]">
        <div className="mb-10 flex flex-wrap items-baseline justify-between gap-4 border-b border-ink/10 pb-6">
          <div>
            <span className="eyebrow">Instructor · onboarding</span>
            <h1 className="mt-2 text-[clamp(24px,4vw,34px)] leading-[1.1]">
              Preparer paperwork
            </h1>
          </div>
          <AcademyNav role="instructor" pendingRequests={requests.length} />
        </div>

        <OnboardingTracker
          rows={rows}
          rosterSuggestions={rosterSuggestions}
          planUrl={planUrl}
        />
      </div>
    </section>
  );
}
