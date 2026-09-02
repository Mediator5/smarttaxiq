import Image from "next/image";

const LOGO_RATIO = 214 / 1640;
const MARK_RATIO = 211 / 292;

/**
 * The SmartTaxIQ lockup.
 *
 * `full`  — monogram + wordmark, the supplied artwork. Header and footer.
 * `mark`  — the ST monogram alone, for tight spaces.
 *
 * `light` swaps to the artwork drawn for dark backgrounds.
 */
export default function Logo({
  variant = "dark",
  kind = "full",
  width = 190,
  priority = false,
  className = "",
}: {
  variant?: "dark" | "light";
  kind?: "full" | "mark";
  width?: number;
  priority?: boolean;
  className?: string;
}) {
  if (kind === "mark") {
    return (
      <Image
        src="/images/st-mark.png"
        alt="SmartTaxIQ"
        width={width}
        height={Math.round(width * MARK_RATIO)}
        priority={priority}
        className={className}
        style={{ height: "auto" }}
      />
    );
  }

  return (
    <Image
      src={
        variant === "light"
          ? "/images/smarttaxiq-logo-light.png"
          : "/images/smarttaxiq-logo.png"
      }
      alt="SmartTaxIQ"
      width={width}
      height={Math.round(width * LOGO_RATIO)}
      priority={priority}
      className={className}
      style={{ height: "auto" }}
    />
  );
}
