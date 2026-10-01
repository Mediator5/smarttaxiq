/**
 * Turns a pasted video link into something embeddable.
 *
 * Lashanda pastes whatever the browser address bar or the Share button gave
 * her, which for YouTube alone is five different shapes. Asking her for "the
 * embed URL" would be asking her to learn a thing that exists only because of
 * how we built the page, so the parsing happens here instead.
 *
 * Returns null for anything it does not recognise, and the caller shows the
 * raw link rather than an empty box — a wrong-looking video is easier to
 * diagnose than a blank space.
 */

export type Embed = { provider: "youtube" | "vimeo"; src: string };

export function toEmbed(url: string | null | undefined): Embed | null {
  if (!url) return null;
  const raw = url.trim();
  if (!raw) return null;

  let u: URL;
  try {
    u = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
  } catch {
    return null;
  }

  const host = u.hostname.replace(/^www\./, "").toLowerCase();

  // youtu.be/ID · youtube.com/watch?v=ID · /embed/ID · /live/ID · /shorts/ID
  if (host === "youtu.be") {
    const id = u.pathname.split("/").filter(Boolean)[0];
    return id ? { provider: "youtube", src: ytSrc(id, u) } : null;
  }
  if (host.endsWith("youtube.com") || host === "youtube-nocookie.com") {
    const v = u.searchParams.get("v");
    if (v) return { provider: "youtube", src: ytSrc(v, u) };
    const parts = u.pathname.split("/").filter(Boolean);
    const i = parts.findIndex((p) =>
      ["embed", "live", "shorts", "v"].includes(p)
    );
    const id = i >= 0 ? parts[i + 1] : undefined;
    return id ? { provider: "youtube", src: ytSrc(id, u) } : null;
  }

  // vimeo.com/ID · vimeo.com/ID/HASH (unlisted) · player.vimeo.com/video/ID
  if (host.endsWith("vimeo.com")) {
    const parts = u.pathname.split("/").filter(Boolean);
    const idx = parts.indexOf("video");
    const id = (idx >= 0 ? parts[idx + 1] : parts[0]) ?? "";
    if (!/^\d+$/.test(id)) return null;
    // An unlisted video carries a hash as the next segment; without it the
    // embed is refused.
    const hash = (idx >= 0 ? parts[idx + 2] : parts[1]) ?? "";
    const q = /^[A-Za-z0-9]+$/.test(hash) ? `?h=${hash}` : "";
    return { provider: "vimeo", src: `https://player.vimeo.com/video/${id}${q}` };
  }

  return null;
}

/** Keeps a start time if she copied the link at a timestamp. */
function ytSrc(id: string, u: URL) {
  const clean = id.replace(/[^A-Za-z0-9_-]/g, "");
  const t = u.searchParams.get("t") ?? u.searchParams.get("start");
  const secs = t ? parseTime(t) : 0;
  return `https://www.youtube-nocookie.com/embed/${clean}${
    secs ? `?start=${secs}` : ""
  }`;
}

function parseTime(t: string) {
  if (/^\d+$/.test(t)) return Number(t);
  const m = t.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/);
  if (!m) return 0;
  return Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0);
}
