import { NextResponse } from "next/server";
import { currentStudent } from "@/lib/academy/auth";
import {
  academyConfigured,
  createAnnouncement,
  getStudentEmails,
  saveModuleExtra,
  setAnnouncementHidden,
} from "@/lib/academy/store";
import { sendAnnouncement } from "@/lib/academy/mail";
import { modules } from "@/content/academy/modules";

export const dynamic = "force-dynamic";

/**
 * The instructor's writes that are not roster changes: module videos and notes,
 * and announcements.
 *
 * Instructor-gated at the top against the database, like /api/academy/roster.
 * Nothing here can break a knowledge check — module TEXT is not editable from
 * the web, by design, because the quizzes depend on exact markup.
 */

export async function POST(request: Request) {
  try {
    if (!academyConfigured()) {
      return NextResponse.json(
        { ok: false, error: "The Academy isn't configured." },
        { status: 503 }
      );
    }

    const viewer = await currentStudent();
    if (!viewer || viewer.role !== "instructor") {
      return NextResponse.json(
        { ok: false, error: "Not found." },
        { status: 404 }
      );
    }

    const body = (await request.json().catch(() => null)) as Record<
      string,
      unknown
    > | null;
    const action = typeof body?.action === "string" ? body.action : "";

    /* ------------------------------------------------------- module ---- */
    if (action === "save-module") {
      const moduleIdx = Number(body?.moduleIdx);
      if (!modules.some((m) => m.idx === moduleIdx)) {
        return NextResponse.json(
          { ok: false, error: "That isn't one of the modules." },
          { status: 400 }
        );
      }

      await saveModuleExtra({
        moduleIdx,
        videoUrl: typeof body?.videoUrl === "string" ? body.videoUrl : null,
        videoTitle:
          typeof body?.videoTitle === "string" ? body.videoTitle : null,
        note: typeof body?.note === "string" ? body.note : null,
        byStudentId: viewer.id,
      });

      return NextResponse.json({ ok: true });
    }

    /* ------------------------------------------------- announcement ---- */
    if (action === "announce") {
      const text = typeof body?.body === "string" ? body.body.trim() : "";
      const email = body?.email === true;

      if (text.length < 3) {
        return NextResponse.json(
          { ok: false, error: "Write something first." },
          { status: 400 }
        );
      }

      const recipients = email ? await getStudentEmails(viewer.cohort) : [];

      // Record it first. A notice that reached the page but not the inbox is a
      // partial success; one that emailed and vanished is a support call.
      const saved = await createAnnouncement({
        body: text,
        byStudentId: viewer.id,
        emailed: email && recipients.length > 0,
      });

      let emailedCount = 0;
      let emailError: string | null = null;
      if (email) {
        if (!recipients.length) {
          emailError = "Nobody on the roster to email yet — it's posted on the course page.";
        } else {
          const result = await sendAnnouncement({
            recipients,
            body: text,
            fromName: viewer.first_name,
          });
          emailedCount = result.sent;
          if (result.failed.length) {
            emailError = `Posted, but ${result.failed.length} email${
              result.failed.length === 1 ? "" : "s"
            } didn't send.`;
          }
        }
      }

      return NextResponse.json({
        ok: true,
        announcement: saved,
        emailedCount,
        emailError,
      });
    }

    /* ------------------------------------------------------- hide ------ */
    if (action === "hide" || action === "unhide") {
      const id = typeof body?.id === "string" ? body.id : "";
      if (!id) {
        return NextResponse.json(
          { ok: false, error: "Which announcement?" },
          { status: 400 }
        );
      }
      await setAnnouncementHidden(id, action === "hide");
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json(
      { ok: false, error: "Unknown action." },
      { status: 400 }
    );
  } catch (err) {
    console.error("[academy] teaching write failed:", err);
    return NextResponse.json(
      { ok: false, error: "That didn't save. Try again in a moment." },
      { status: 500 }
    );
  }
}