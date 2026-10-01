import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { currentStudent } from "@/lib/academy/auth";
import { academyConfigured } from "@/lib/academy/store";
import { materialBySlug } from "@/content/academy/materials";

export const dynamic = "force-dynamic";

/**
 * Serves a PDF from src/content/academy/files/ after checking the session.
 *
 * The files sit outside public/ on purpose. Four of the six are answer keys,
 * and a file in public/ is served by filename to anyone who guesses it — which
 * for /academy-materials/final-exam-key.pdf is not much of a guess. Routing
 * them through here means a download is always attached to a signed-in person
 * with the right role.
 *
 * `slug` is never used to build the path. It selects an entry from a fixed
 * list, and the filename comes from that entry, so no amount of `../` in the
 * URL reaches another file.
 */
export async function GET(
  _request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    if (!academyConfigured()) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }

    const material = materialBySlug(params.slug);
    if (!material) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }

    const viewer = await currentStudent();
    if (!viewer) {
      return NextResponse.json({ error: "Not signed in." }, { status: 401 });
    }
    if (material.audience === "instructor" && viewer.role !== "instructor") {
      // A trainee asking for the answer key gets the same answer as a trainee
      // asking for a file that does not exist.
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }

    const file = path.join(
      process.cwd(),
      "src",
      "content",
      "academy",
      "files",
      material.file
    );

    const bytes = await fs.promises.readFile(file);

    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": "application/pdf",
        // `inline` so it opens in the browser's PDF viewer, where printing is
        // one keystroke away — printing is the whole point of these.
        "Content-Disposition": `inline; filename="${material.file}"`,
        "Content-Length": String(bytes.length),
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    console.error("[academy] material download failed:", err);
    return NextResponse.json(
      { error: "That file could not be read." },
      { status: 500 }
    );
  }
}
