import Link from "next/link";
import { notFound } from "next/navigation";
import { currentStudent, sessionSecretConfigured } from "@/lib/academy/auth";
import {
  academyConfigured,
  getAnnouncements,
  getModuleExtras,
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

  const [extras, announcements] = await Promise.all([
    getModuleExtras(),
    getAnnouncements({ includeHidden: true }),
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
          <div className="flex flex-wrap items-center gap-5">
            <Link
              href="/academy/instructor"
              className="text-[14.5px] font-semibold text-ink underline underline-offset-4 hover:text-gold-700"
            >
              Cohort progress
            </Link>
            <Link
              href="/academy/roster"
              className="text-[14.5px] font-semibold text-ink underline underline-offset-4 hover:text-gold-700"
            >
              Roster
            </Link>
            <Link
              href="/academy"
              className="text-[14.5px] text-ink/55 underline underline-offset-4 hover:text-ink"
            >
              The course
            </Link>
          </div>
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
