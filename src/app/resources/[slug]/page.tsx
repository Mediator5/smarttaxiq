import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import CtaBand from "@/components/CtaBand";
import Reveal from "@/components/Reveal";
import { formatPostDate, getPost, posts } from "@/lib/posts";
import { site } from "@/lib/site";

export function generateStaticParams() {
  return posts.map((p) => ({ slug: p.slug }));
}

export function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Metadata {
  const post = getPost(params.slug);
  if (!post) return { title: "Article not found" };

  return {
    title: post.title,
    description: post.excerpt,
    alternates: { canonical: `/resources/${post.slug}` },
    openGraph: {
      type: "article",
      title: post.title,
      description: post.excerpt,
      publishedTime: post.date,
    },
  };
}

/**
 * Renders the article body.
 *
 * "## " starts a heading, "- " starts a bullet, everything else is a
 * paragraph. Inline **bold** is supported because a few articles lean on it
 * for the terms being defined.
 */
function Body({ text }: { text: string }) {
  const blocks = text.split("\n\n");
  const out: React.ReactNode[] = [];
  let bullets: string[] = [];

  const flush = (key: string) => {
    if (!bullets.length) return;
    out.push(
      <ul key={`ul-${key}`} className="my-6 space-y-3 pl-1">
        {bullets.map((b, i) => (
          <li key={i} className="flex gap-3">
            <span
              aria-hidden
              className="mt-[10px] h-1.5 w-1.5 shrink-0 rounded-full bg-gold-500"
            />
            <span className="text-[16.5px] leading-[1.8] text-ink/75">
              <Inline text={b} />
            </span>
          </li>
        ))}
      </ul>
    );
    bullets = [];
  };

  blocks.forEach((block, bi) => {
    const lines = block.split("\n");

    if (lines.every((l) => l.startsWith("- "))) {
      bullets.push(...lines.map((l) => l.slice(2)));
      return;
    }

    flush(String(bi));

    if (block.startsWith("## ")) {
      out.push(
        <h2 key={bi} className="mt-12 text-[24px] leading-snug sm:text-[27px]">
          {block.slice(3)}
        </h2>
      );
      return;
    }

    out.push(
      <p key={bi} className="mt-5 text-[16.5px] leading-[1.85] text-ink/75">
        <Inline text={block} />
      </p>
    );
  });

  flush("end");
  return <>{out}</>;
}

function Inline({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith("**") && part.endsWith("**") ? (
          <strong key={i} className="font-semibold text-ink">
            {part.slice(2, -2)}
          </strong>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

export default function ArticlePage({ params }: { params: { slug: string } }) {
  const post = getPost(params.slug);
  if (!post) notFound();

  const related = posts.filter((p) => p.slug !== post.slug).slice(0, 3);

  const schema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt,
    datePublished: post.date,
    author: { "@type": "Person", name: site.preparer.name },
    publisher: { "@type": "Organization", name: site.name },
    mainEntityOfPage: `${site.url}/resources/${post.slug}`,
  };

  return (
    <>
      <article>
        <header className="bg-ink py-14 text-white sm:py-16">
          <div className="shell max-w-3xl">
            <Reveal>
              <Link
                href="/resources"
                className="inline-flex items-center gap-2 text-[13.5px] font-semibold text-white/60 transition hover:text-gold-300"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    d="M19 12H5m6 6l-6-6 6-6"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                All resources
              </Link>

              <div className="mt-7 flex items-center gap-3 text-[11.5px] font-bold uppercase tracking-[0.12em]">
                <span className="text-gold-400">{post.category}</span>
                <span className="text-white/25">·</span>
                <span className="text-white/45">
                  {post.readMinutes} min read
                </span>
              </div>

              <h1 className="mt-4 text-[30px] leading-[1.15] !text-white sm:text-[40px]">
                {post.title}
              </h1>
              <p className="mt-5 text-[17px] leading-[1.7] text-white/65">
                {post.excerpt}
              </p>
              <p className="mt-7 text-[13.5px] text-white/40">
                {formatPostDate(post.date)} · {site.preparer.name}
              </p>
            </Reveal>
          </div>
        </header>

        <div className="shell max-w-3xl py-14 sm:py-16">
          <Reveal>
            <div className="relative aspect-[16/9] overflow-hidden rounded-2xl border border-ink/10">
              <Image
                src={`/images/${post.image}`}
                alt=""
                fill
                priority
                sizes="(max-width: 768px) 100vw, 760px"
                className="object-cover"
              />
            </div>
          </Reveal>

          <div className="mt-12">
            <Body text={post.body} />
          </div>

          <div className="mt-14 rounded-2xl border border-ink/10 bg-ice p-7">
            <p className="text-[14.5px] leading-[1.75] text-ink/60">
              This article is general information, not advice for your
              situation. If you want it applied to your actual numbers,{" "}
              <Link
                href="/start"
                className="font-semibold text-ink underline underline-offset-4"
              >
                start a return
              </Link>{" "}
              or call{" "}
              <a
                href={site.phoneHref}
                className="font-semibold text-ink underline underline-offset-4"
              >
                {site.phone}
              </a>
              .
            </p>
          </div>
        </div>
      </article>

      <section className="border-t border-ink/8 py-14 sm:py-16">
        <div className="shell">
          <h2 className="text-[22px]">Keep reading</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {related.map((p) => (
              <Link
                key={p.slug}
                href={`/resources/${p.slug}`}
                className="group flex h-full flex-col rounded-2xl border border-ink/10 bg-white p-6 transition hover:border-gold-400 hover:shadow-card"
              >
                <span className="text-[11.5px] font-bold uppercase tracking-[0.12em] text-gold-700">
                  {p.category}
                </span>
                <h3 className="mt-3 text-[17px] leading-snug">{p.title}</h3>
                <p className="mt-3 flex-1 text-[14.5px] leading-[1.7] text-ink/60">
                  {p.excerpt}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <CtaBand />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
    </>
  );
}
