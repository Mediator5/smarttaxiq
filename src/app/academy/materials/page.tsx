import { notFound } from "next/navigation";
import AcademyNav from "@/components/academy/AcademyNav";
import { currentStudent, sessionSecretConfigured } from "@/lib/academy/auth";
import {
  academyConfigured,
  getPendingAccessRequests,
} from "@/lib/academy/store";
import {
  materialGroups,
  materials,
  type Material,
} from "@/content/academy/materials";

/**
 * Printable materials.
 *
 * Open to everyone on the roster, with the instructor-only files simply absent
 * for trainees — not greyed out, not "you don't have permission", just not
 * there. A visible locked door invites someone to try the handle.
 *
 * Every file opens in the browser's PDF viewer rather than downloading, which
 * puts print one keystroke away. That is what these are for.
 */
export const dynamic = "force-dynamic";

function Row({ m }: { m: Material }) {
  return (
    <li className="border-t border-ink/10 py-5 first:border-t-0 sm:py-6">
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-[18px] font-bold text-ink">
            {m.title}
            <span className="ml-3 align-middle font-mono text-[12px] font-normal text-ink/45">
              {m.pages} pages
            </span>
            {m.audience === "instructor" && (
              <span className="ml-2 rounded-full bg-gold-100 px-2.5 py-0.5 align-middle text-[11px] font-bold uppercase tracking-[0.08em] text-gold-700">
                Instructor only
              </span>
            )}
          </h3>
          <p className="mt-1.5 max-w-[58ch] text-[15px] leading-relaxed text-ink/70">
            {m.blurb}
          </p>
        </div>
        <a
          href={`/api/academy/materials/${m.slug}`}
          target="_blank"
          rel="noopener"
          className="btn-outline shrink-0 px-5 py-2.5 text-[14.5px]"
        >
          Open PDF
        </a>
      </div>
    </li>
  );
}

export default async function MaterialsPage() {
  if (!academyConfigured() || !sessionSecretConfigured()) notFound();

  const viewer = await currentStudent();
  if (!viewer) notFound();

  const isInstructor = viewer.role === "instructor";

  // Only an instructor can act on a request, so only an instructor pays for
  // the query — but the badge then matches every other page.
  const pending = isInstructor ? (await getPendingAccessRequests()).length : 0;
  const visible = materials.filter(
    (m) => isInstructor || m.audience === "student"
  );

  return (
    <section className="py-10 sm:py-14">
      <div className="shell max-w-[860px]">
        <div className="mb-8 flex flex-wrap items-baseline justify-between gap-4 border-b border-ink/10 pb-6">
          <div>
            <span className="eyebrow">Academy · materials</span>
            <h1 className="mt-2 text-[clamp(24px,4vw,34px)] leading-[1.1]">
              Everything printable
            </h1>
          </div>
          <AcademyNav role={viewer.role} pendingRequests={pending} />
        </div>

        <p className="lede max-w-[62ch]">
          {isInstructor
            ? "Open any of these and print straight from the browser. They are the same documents the course teaches from, so a page number quoted in class matches what is on a student's desk."
            : "Print these or work from them on screen. The workbook is the one to bring to every session."}
        </p>

        {materialGroups.map((group) => {
          const rows = visible.filter((m) => m.group === group);
          if (!rows.length) return null;
          return (
            <div key={group} className="mt-12">
              <h2 className="font-mono text-[11.5px] font-semibold uppercase tracking-[0.14em] text-gold-700">
                {group}
              </h2>
              <ul className="mt-3">
                {rows.map((m) => (
                  <Row key={m.slug} m={m} />
                ))}
              </ul>
            </div>
          );
        })}

        {isInstructor && (
          <div className="card-quiet mt-14">
            <h2 className="text-[17px] font-bold">Printing for a class</h2>
            <ul className="mt-3 space-y-2 pl-5 text-[15.5px] leading-relaxed text-ink/75 [list-style:disc]">
              <li>
                The <strong>workbook</strong> is built for double-sided Letter.
                Print it once per student and they write in it all ten weeks.
              </li>
              <li>
                The <strong>practice return packs</strong> are Week 10 only. One
                set per student, and keep the solution sets off the desk.
              </li>
              <li>
                The <strong>exam</strong> prints on the day. Paper B, the retake
                set, is inside the key — do not hand out the key by mistake.
              </li>
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
