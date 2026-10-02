import { notFound } from "next/navigation";
import AcademyNav from "@/components/academy/AcademyNav";
import { currentStudent, sessionSecretConfigured } from "@/lib/academy/auth";
import {
  academyConfigured,
  getAnnouncements,
  getModuleExtras,
  getPendingAccessRequests,
} from "@/lib/academy/store";
import { modules } from "@/content/academy/modules";
import TeachingManager from "@/components/academy/TeachingManager";

/**
 * Videos, module notes and announcements — the parts of the course the
 * instructor changes week to week.
 *
 * Separate from /academy/roster, which is about people. This is about content,
 * and the two get confused if they share a page.
 */
export const dynamic = "force-dynamic";

export default async function TeachingPage() {
  if (!academyConfigured() || !sessionSecretConfigured()) notFound();

  const viewer = await currentStudent();
  if (!viewer || viewer.role !== "instructor") notFound();

  const [extras, announcements, requests] = await Promise.all([
    getModuleExtras(),
    getAnnouncements({ includeHidden: true }),
    // Only for the nav badge, so a waiting request is visible from every page
    // rather than only the two that happened to query for it.
    getPendingAccessRequests(),
  ]);

  return (
    <section className="py-10 sm:py-14">
      <div className="shell max-w-[900px]">
        <div className="mb-10 flex flex-wrap items-baseline justify-between gap-4 border-b border-ink/10 pb-6">
          <div>
            <span className="eyebrow">Instructor · teaching</span>
            <h1 className="mt-2 text-[clamp(24px,4vw,34px)] leading-[1.1]">
              Videos and notices
            </h1>
          </div>
          <AcademyNav role="instructor" pendingRequests={requests.length} />
        </div>

        <TeachingManager
          modules={modules}
          extras={extras}
          announcements={announcements}
        />
      </div>
    </section>
  );
}
