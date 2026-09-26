"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SignOutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await fetch("/api/academy/sign-out", { method: "POST" });
        router.replace("/academy");
        router.refresh();
      }}
      className="text-[14.5px] text-ink/55 underline underline-offset-4 hover:text-ink disabled:opacity-60"
    >
      {busy ? "Signing out…" : "Sign out"}
    </button>
  );
}
