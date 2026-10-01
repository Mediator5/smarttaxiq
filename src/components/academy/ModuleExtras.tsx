"use client";

import { useEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import { toEmbed } from "@/lib/academy/video";
import type { ModuleExtra } from "@/lib/academy/store";

/**
 * Puts the instructor's video and note at the top of each module.
 *
 * The module bodies are server-rendered from course.html as one block of
 * markup, so there is no React tree to hang these off. This component mounts a
 * small root inside each `section.m` instead — the same reach-into-the-DOM
 * approach CourseRuntime already uses, for the same reason: keeping the course
 * out of a client component is what stops 73KB of teaching shipping twice.
 *
 * Renders nothing itself.
 */
export default function ModuleExtras({ extras }: { extras: ModuleExtra[] }) {
  useEffect(() => {
    const roots: Root[] = [];

    for (const extra of extras) {
      if (!extra.video_url && !extra.note) continue;

      const section = document.getElementById(`m${extra.module_idx}`);
      if (!section) continue;

      // Go in after the module's heading block, before the teaching starts.
      const top = section.querySelector(".m-top");
      if (!top) continue;

      const host = document.createElement("div");
      host.className = "m-extras";
      top.insertAdjacentElement("afterend", host);

      const root = createRoot(host);
      root.render(<Extras extra={extra} />);
      roots.push(root);
    }

    return () => {
      // Unmount asynchronously: React refuses to tear down a root while it is
      // rendering the tree that owns this effect.
      const pending = roots.slice();
      setTimeout(() => {
        for (const r of pending) r.unmount();
        document.querySelectorAll(".m-extras").forEach((n) => n.remove());
      }, 0);
    };
  }, [extras]);

  return null;
}

function Extras({ extra }: { extra: ModuleExtra }) {
  const embed = toEmbed(extra.video_url);

  return (
    <div className="mx-extras">
      {extra.note && (
        <div className="mx-note">
          <p className="mx-lab">From your trainer</p>
          <p>{extra.note}</p>
        </div>
      )}

      {extra.video_url && (
        <div className="mx-video">
          {extra.video_title && <p className="mx-lab">{extra.video_title}</p>}
          {embed ? (
            <div className="mx-frame">
              <iframe
                src={embed.src}
                title={extra.video_title || "Module video"}
                loading="lazy"
                allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                allowFullScreen
              />
            </div>
          ) : (
            // An unrecognised link still gets you to the video. Showing the raw
            // URL is far easier to diagnose than an empty box.
            <p className="mx-fallback">
              <a href={extra.video_url} target="_blank" rel="noopener noreferrer">
                Open the video for this module
              </a>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
