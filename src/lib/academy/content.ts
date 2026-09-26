import fs from "fs";
import path from "path";

/**
 * Loads the course body off disk at render time.
 *
 * Read with fs rather than imported, because the content is a .html file that
 * is edited as prose. It is cached in module scope, so on a warm serverless
 * instance this is one read for the life of the instance and zero after that;
 * in development the module is re-evaluated on change, so edits to the course
 * show up on refresh.
 *
 * The file is repository source, not user input — see the comment at the top
 * of course.html for why rendering it with dangerouslySetInnerHTML is the
 * right call here and would not be anywhere near a form.
 */

let cached: string | null = null;

export function courseHtml(): string {
  if (cached !== null) return cached;

  const file = path.join(
    process.cwd(),
    "src",
    "content",
    "academy",
    "course.html"
  );

  try {
    cached = fs.readFileSync(file, "utf8");
  } catch (err) {
    console.error("[academy] could not read course.html:", err);
    cached = "";
  }

  return cached;
}
