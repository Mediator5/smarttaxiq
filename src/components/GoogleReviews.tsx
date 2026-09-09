import { site } from "@/lib/site";

/**
 * "Read our Google reviews" button.
 *
 * Deliberately a link out rather than embedded review text. Reviews scraped
 * onto a site are unverifiable — a visitor has no way to tell them from copy
 * — whereas a link to the live profile is proof, and the click also puts the
 * visitor on the page where they could leave one themselves. Google's own
 * guidelines are also clear that reviews should not be reproduced wholesale.
 *
 * The same profile serves both brands, so this component is identical on both
 * sites and the review count compounds in one place instead of splitting.
 */
export default function GoogleReviews({
  label = "Read our Google reviews",
  className = "",
  tone = "light",
}: {
  label?: string;
  className?: string;
  /** `light` for pale backgrounds, `dark` for navy sections. */
  tone?: "light" | "dark";
}) {
  const base =
    "inline-flex items-center gap-2.5 rounded-full border px-5 py-3 text-[14px] font-semibold transition";
  const skin =
    tone === "dark"
      ? "border-white/25 text-white hover:border-gold-300 hover:text-gold-300"
      : "border-ink/15 text-ink hover:border-gold-600 hover:text-gold-700";

  return (
    <a
      href={site.googleReviewUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`${base} ${skin} ${className}`}
    >
      {/* Google's four-colour mark. */}
      <svg width="17" height="17" viewBox="0 0 48 48" aria-hidden>
        <path
          fill="#4285F4"
          d="M45.1 24.5c0-1.6-.1-2.8-.4-4H24v7.3h12.1c-.2 2-1.6 5-4.5 7l-.1.3 6.5 5 .5.1c4.2-3.9 6.6-9.6 6.6-15.7"
        />
        <path
          fill="#34A853"
          d="M24 46c5.9 0 10.9-1.9 14.5-5.3l-6.9-5.4c-1.8 1.3-4.3 2.2-7.6 2.2-5.8 0-10.7-3.8-12.5-9.1l-.3.1-6.8 5.2-.1.3C7.9 41 15.4 46 24 46"
        />
        <path
          fill="#FBBC05"
          d="M11.5 28.4c-.5-1.4-.7-2.9-.7-4.4s.3-3 .7-4.4v-.3l-6.9-5.4-.2.1C2.9 16.9 2 20.4 2 24s.9 7.1 2.4 10.1l7.1-5.7"
        />
        <path
          fill="#EA4335"
          d="M24 10.4c4.1 0 6.9 1.8 8.5 3.3l6.2-6C34.9 4.2 29.9 2 24 2 15.4 2 7.9 7 4.4 13.9l7.1 5.7c1.8-5.3 6.7-9.2 12.5-9.2"
        />
      </svg>
      {label}
      <span aria-hidden className="opacity-50">
        &rarr;
      </span>
    </a>
  );
}
