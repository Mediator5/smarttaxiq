import type { MetadataRoute } from "next";
import { posts } from "@/lib/posts";
import { site } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const pages: { path: string; priority: number; freq: "weekly" | "monthly" }[] =
    [
      { path: "", priority: 1, freq: "weekly" },
      { path: "/services", priority: 0.9, freq: "monthly" },
      { path: "/start", priority: 0.9, freq: "monthly" },
      { path: "/pricing", priority: 0.8, freq: "monthly" },
      { path: "/process", priority: 0.8, freq: "monthly" },
      { path: "/deadlines", priority: 0.8, freq: "weekly" },
      { path: "/about", priority: 0.7, freq: "monthly" },
      { path: "/faq", priority: 0.7, freq: "monthly" },
      { path: "/resources", priority: 0.7, freq: "weekly" },
      { path: "/contact", priority: 0.6, freq: "monthly" },
      { path: "/privacy", priority: 0.3, freq: "monthly" },
    ];

  return [
    ...pages.map((p) => ({
      url: `${site.url}${p.path}`,
      lastModified: now,
      changeFrequency: p.freq,
      priority: p.priority,
    })),
    ...posts.map((p) => ({
      url: `${site.url}/resources/${p.slug}`,
      lastModified: new Date(p.date),
      changeFrequency: "yearly" as const,
      priority: 0.6,
    })),
  ];
}
