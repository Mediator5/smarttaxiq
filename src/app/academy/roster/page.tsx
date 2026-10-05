import { notFound } from "next/navigation";
import AcademyNav from "@/components/academy/AcademyNav";
import { currentStudent, sessionSecretConfigured } from "@/lib/academy/auth";
import {
  academyConfigured,
  getPendingAccessRequests,
  getRoster,
} from "@/lib/academy/store";
import RosterManager from "@/components/academy/RosterManager";
import StaffSignIn from "@/components/academy/StaffSignIn";

/**
 * Enrolment, without SQL.
 *
 * Everything on this page was previously a statement someone had to write by
 * hand in the Supabase editor, which is fine for a developer and wrong for the
 * person who actually runs the course. Adding a trainee at 9pm the night
 * before Week 1 should not require remembering an `on conflict` clause.
 *
 * Gated on the `instructor` role, and anyone else gets a 404 rather than a
 * "forbidden" — there is no reason to confirm to a trainee that this exists.
 */
export const dynamic = "force-dynamic";

export default async function RosterPage() {
  if (!academyConfigured() || !sessionSecretConfigured()) notFound();

  const viewer = await currentStudent();
  // Signed out is a different situation from signed in as a trainee, and the
  // two get different answers — see the note in StaffSignIn.
  if (!viewer) return <StaffSignIn area="the roster" />;
  if (viewer.role !== "instructor") notFound();

  const [roster, requests] = await Promise.all([
    getRoster(),
    getPendingAccessRequests(),
  ]);

  return (
    <section className="py-10 sm:py-14">
      <div className="shell max-w-[900px]">
        <div className="mb-10 flex flex-wrap items-baseline justify-between gap-4 border-b border-ink/10 pb-6">
          <div>
            <span className="eyebrow">Instructor · roster</span>
            <h1 className="mt-2 text-[clamp(24px,4vw,34px)] leading-[1.1]">
              Who&rsquo;s on the course
            </h1>
          </div>
          <AcademyNav role="instructor" pendingRequests={requests.length} />
        </div>

        <RosterManager
          roster={roster}
          requests={requests}
          cohort={viewer.cohort}
          viewerId={viewer.id}
        />
      </div>
    </section>
  );
}
