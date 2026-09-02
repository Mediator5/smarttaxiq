"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { categories, formatPostDate, type Post } from "@/lib/posts";

export default function PostGrid({ posts }: { posts: Post[] }) {
  const [active, setActive] = useState<string>("All");
  const shown =
    active === "All" ? posts : posts.filter((p) => p.category === active);

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {categories.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setActive(c)}
            aria-pressed={active === c}
            className={`rounded-lg px-4 py-2 text-[13.5px] font-semibold transition ${
              active === c
                ? "bg-ink text-white"
                : "border border-ink/15 text-ink/60 hover:border-ink/40 hover:text-ink"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {shown.map((p) => (
          <article key={p.slug} className="h-full">
            <Link
              href={`/resources/${p.slug}`}
              className="group flex h-full flex-col overflow-hidden rounded-2xl border border-ink/10 bg-white shadow-card transition duration-200 hover:-translate-y-0.5 hover:border-gold-400 hover:shadow-lift"
            >
              <div className="relative aspect-[16/10] overflow-hidden bg-ice">
                <Image
                  src={`/images/${p.image}`}
                  alt=""
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1240px) 50vw, 380px"
                  className="object-cover transition duration-500 group-hover:scale-[1.03]"
                />
              </div>
              <div className="flex flex-1 flex-col p-6">
                <div className="flex items-center gap-3 text-[11.5px] font-bold uppercase tracking-[0.12em]">
                  <span className="text-gold-700">{p.category}</span>
                  <span className="text-ink/25">·</span>
                  <span className="text-ink/40">{p.readMinutes} min read</span>
                </div>
                <h2 className="mt-3 text-[18px] leading-snug">{p.title}</h2>
                <p className="mt-3 flex-1 text-[14.5px] leading-[1.7] text-ink/60">
                  {p.excerpt}
                </p>
                <p className="mt-5 text-[13px] text-ink/40">
                  {formatPostDate(p.date)}
                </p>
              </div>
            </Link>
          </article>
        ))}
      </div>

      {shown.length === 0 && (
        <p className="mt-12 text-[15px] text-ink/55">
          Nothing in this category yet.
        </p>
      )}
    </div>
  );
}
