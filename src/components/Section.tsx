import type { ReactNode } from "react";
import Reveal from "./Reveal";

export function PageHero({
  eyebrow,
  title,
  intro,
  children,
}: {
  eyebrow?: string;
  title: ReactNode;
  intro?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <section className="relative overflow-hidden bg-ink text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-32 -top-40 h-[460px] w-[460px] rounded-full bg-gold-500/12 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-48 left-1/4 h-[360px] w-[360px] rounded-full bg-mint-500/10 blur-3xl"
      />
      <div className="shell relative py-16 sm:py-20">
        <Reveal className="max-w-3xl">
          {eyebrow && <span className="eyebrow-light">{eyebrow}</span>}
          <h1 className="mt-5 text-[34px] leading-[1.1] !text-white sm:text-[46px]">
            {title}
          </h1>
          {intro && (
            <p className="mt-6 max-w-2xl text-[17px] leading-[1.75] text-white/70">
              {intro}
            </p>
          )}
          {children && <div className="mt-9">{children}</div>}
        </Reveal>
      </div>
    </section>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  intro,
  align = "left",
  light = false,
}: {
  eyebrow?: string;
  title: ReactNode;
  intro?: ReactNode;
  align?: "left" | "center";
  light?: boolean;
}) {
  return (
    <Reveal
      className={`max-w-2xl ${align === "center" ? "mx-auto text-center" : ""}`}
    >
      {eyebrow && (
        <span className={light ? "eyebrow-light" : "eyebrow"}>{eyebrow}</span>
      )}
      <h2
        className={`mt-4 text-[28px] leading-[1.18] sm:text-[36px] ${
          light ? "!text-white" : ""
        }`}
      >
        {title}
      </h2>
      {intro && (
        <p
          className={`mt-5 text-[16.5px] leading-[1.75] ${
            light ? "text-white/70" : "text-ink/70"
          }`}
        >
          {intro}
        </p>
      )}
    </Reveal>
  );
}

export function Check({ light = false }: { light?: boolean }) {
  return (
    <span
      aria-hidden
      className={`mt-[3px] flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
        light ? "bg-mint-500/20" : "bg-mint-100"
      }`}
    >
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
        <path
          d="M20 6L9 17l-5-5"
          stroke={light ? "#7bd8ba" : "#068662"}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

export function BulletList({
  items,
  light = false,
}: {
  items: readonly string[];
  light?: boolean;
}) {
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item} className="flex gap-3">
          <Check light={light} />
          <span
            className={`text-[15.5px] leading-[1.65] ${
              light ? "text-white/75" : "text-ink/75"
            }`}
          >
            {item}
          </span>
        </li>
      ))}
    </ul>
  );
}
