"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { OnboardingFile, UploadKind } from "@/lib/academy/store";

/**
 * The preparer's document uploads: W-9, photo ID, and a free slot.
 *
 * Deliberate behaviours, each learned from watching people fail at exactly
 * this kind of form:
 *
 *   - A file uploads the moment it is chosen. There is no "save" step to
 *     forget, and a person who gets interrupted after one document has
 *     genuinely sent that document.
 *
 *   - The list of what has arrived is shown, with the time. "Did that work?"
 *     is the single most common thought at this point in a form.
 *
 *   - It keeps working after the form is submitted, until the link expires.
 *     People send the PTIN and the signature in two minutes and then go
 *     looking for their W-9 for a day and a half.
 *
 *   - Nothing here can delete. A preparer who uploads the wrong page should
 *     upload the right one and say so; letting a bearer link destroy records
 *     it can also read is a trade with no upside.
 *
 *   - The list is re-fetched on mount rather than trusted from the server
 *     render. The server-rendered copy came back empty in production even
 *     with the route forced dynamic, while the same query through the route
 *     handler returned everything — so the server render is treated as a
 *     first paint and this is the authority. It also means a second device,
 *     or a tab left open since yesterday, shows what is really there.
 */

const KINDS: {
  kind: UploadKind;
  title: string;
  blurb: string;
  needsLabel?: boolean;
}[] = [
  {
    kind: "w9",
    title: "Your W-9",
    blurb:
      "Signed and dated. A clear photo of the completed form is fine — it does not have to be a scan.",
  },
  {
    kind: "id",
    title: "Photo ID",
    blurb:
      "Driver's licence, state ID or passport. The photo and your name need to be readable; the rest does not matter.",
  },
  {
    kind: "other",
    title: "Anything else",
    blurb:
      "EFIN letter, PTIN card, a certificate — whatever has been asked for. You can add more than one.",
    needsLabel: true,
  },
];

const ACCEPT = "application/pdf,image/jpeg,image/png,image/heic,image/heif";

function prettySize(n: number) {
  return n < 1024 * 1024
    ? `${Math.max(1, Math.round(n / 1024))} KB`
    : `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function prettyWhen(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function IntakeUploads({
  token,
  initialFiles,
}: {
  token: string;
  initialFiles: OnboardingFile[];
}) {
  const [files, setFiles] = useState<OnboardingFile[]>(initialFiles);
  const [busyKind, setBusyKind] = useState<UploadKind | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [label, setLabel] = useState("");

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/intake/upload?token=${encodeURIComponent(token)}`,
        { cache: "no-store" }
      );
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        files?: OnboardingFile[];
      };
      if (res.ok && data.ok && Array.isArray(data.files)) setFiles(data.files);
    } catch {
      // Offline or a flaky connection. The list stays as it is; an upload
      // would have failed loudly anyway.
    }
  }, [token]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function upload(kind: UploadKind, file: File) {
    setBusyKind(kind);
    setError(null);
    try {
      const body = new FormData();
      body.set("token", token);
      body.set("kind", kind);
      if (kind === "other" && label.trim()) body.set("label", label.trim());
      body.set("file", file);

      const res = await fetch("/api/intake/upload", { method: "POST", body });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        file?: OnboardingFile;
      };

      if (!res.ok || data.ok === false || !data.file) {
        setError(data.error ?? "That didn't upload. Try again in a moment.");
        return;
      }
      setFiles((prev) => [data.file as OnboardingFile, ...prev]);
      if (kind === "other") setLabel("");
      void refresh();
    } catch {
      setError("Couldn't reach the server. Check your connection.");
    } finally {
      setBusyKind(null);
    }
  }

  return (
    <section className="mt-8 space-y-5">
      <div>
        <h2 className="text-[19px] font-bold">Your documents</h2>
        <p className="mt-2 max-w-[58ch] text-[15px] leading-relaxed text-ink/65">
          Photograph them with your phone or attach a PDF. Each one sends as
          soon as you choose it, so you can do them one at a time and come back
          later for the rest.
        </p>
      </div>

      {KINDS.map((k) => (
        <Slot
          key={k.kind}
          spec={k}
          files={files.filter((f) => f.kind === k.kind)}
          busy={busyKind === k.kind}
          disabled={busyKind !== null}
          label={label}
          onLabel={setLabel}
          onPick={(file) => upload(k.kind, file)}
        />
      ))}

      {error && (
        <p
          role="alert"
          className="rounded-xl bg-[#fbeeea] px-5 py-4 text-[15px] text-[#a8341c]"
        >
          {error}
        </p>
      )}

      <p className="max-w-[58ch] text-[14px] leading-relaxed text-ink/55">
        PDF or photo, up to 10 MB each. These go straight into Smart Tax IQ&rsquo;s
        private storage — there is no public address for them, and only your
        instructor can open them.
      </p>
    </section>
  );
}

function Slot({
  spec,
  files,
  busy,
  disabled,
  label,
  onLabel,
  onPick,
}: {
  spec: (typeof KINDS)[number];
  files: OnboardingFile[];
  busy: boolean;
  disabled: boolean;
  label: string;
  onLabel: (v: string) => void;
  onPick: (file: File) => void;
}) {
  const input = useRef<HTMLInputElement | null>(null);
  const done = files.length > 0;

  return (
    <div
      className={`rounded-2xl border p-6 ${
        done ? "border-[#bfe0ce] bg-[#f4fbf7]" : "border-ink/10 bg-white"
      }`}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className="text-[17px] font-bold">{spec.title}</h3>
        {done && (
          <span className="text-[13px] font-semibold text-[#1f6f4a]">
            {files.length === 1 ? "Received" : `${files.length} received`}
          </span>
        )}
      </div>
      <p className="mt-2 max-w-[58ch] text-[14.5px] leading-relaxed text-ink/65">
        {spec.blurb}
      </p>

      {files.length > 0 && (
        <ul className="mt-4 space-y-1.5">
          {files.map((f) => (
            <li
              key={f.id}
              className="flex flex-wrap items-baseline gap-x-2 text-[14px] text-ink/70"
            >
              <span className="font-semibold text-ink">
                {f.label ? `${f.label} — ` : ""}
                {f.file_name}
              </span>
              <span className="text-ink/45">
                {prettySize(f.size_bytes)} · {prettyWhen(f.uploaded_at)}
              </span>
            </li>
          ))}
        </ul>
      )}

      {spec.needsLabel && (
        <div className="mt-4 max-w-[320px]">
          <label
            htmlFor="u-label"
            className="block text-[11.5px] font-bold uppercase tracking-[0.16em] text-ink/55"
          >
            What is it? (optional)
          </label>
          <input
            id="u-label"
            value={label}
            onChange={(e) => onLabel(e.target.value)}
            placeholder="EFIN approval letter"
            className="mt-2 w-full rounded-lg border border-ink/15 bg-white px-4 py-2.5 text-[15px] text-ink outline-none transition focus:border-gold-500"
          />
        </div>
      )}

      <input
        ref={input}
        type="file"
        accept={ACCEPT}
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          // Reset first: choosing the same file twice in a row fires no
          // change event otherwise, which reads as "the button is broken".
          e.target.value = "";
          if (file) onPick(file);
        }}
      />

      <button
        type="button"
        disabled={disabled}
        onClick={() => input.current?.click()}
        className="btn-outline mt-4 inline-block px-6 py-2.5 text-[15px] disabled:opacity-50"
      >
        {busy
          ? "Uploading…"
          : done
            ? "Add another"
            : `Choose ${spec.kind === "other" ? "a file" : "or photograph it"}`}
      </button>
    </div>
  );
}
