import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    // /academy is a private training area for a named cohort, not content.
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/academy"] }],
    sitemap: `${site.url}/sitemap.xml`,
    host: site.url,
  };
}
