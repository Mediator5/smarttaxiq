/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  // The Academy course body is a .html file read with fs at render time, not
  // an import, so Next's output file tracing does not see it and it would be
  // missing from the serverless bundle on Vercel — the route would build
  // cleanly and then render an empty course in production. Naming it here is
  // the documented fix.
  // Next 14 still keeps this under `experimental`; it moved to the top level
  // in Next 15. Putting it at the top level here is silently ignored, which
  // builds fine and then serves an empty course in production.
  experimental: {
    outputFileTracingIncludes: {
      "/academy": ["./src/content/academy/**"],
    },
  },

  // The old SmartTaxIQ site's URLs, so inbound links and anything Google
  // still has indexed lands on a real page instead of a 404.
  async redirects() {
    return [
      { source: "/home", destination: "/", permanent: true },
      { source: "/index.php", destination: "/", permanent: true },
      { source: "/get-started", destination: "/start", permanent: true },
      { source: "/getstarted", destination: "/start", permanent: true },
      { source: "/file", destination: "/start", permanent: true },
      { source: "/file-now", destination: "/start", permanent: true },
      { source: "/how-it-works", destination: "/process", permanent: true },
      { source: "/process-2", destination: "/process", permanent: true },
      { source: "/our-services", destination: "/services", permanent: true },
      { source: "/tax-services", destination: "/services", permanent: true },
      { source: "/prices", destination: "/pricing", permanent: true },
      { source: "/rates", destination: "/pricing", permanent: true },
      { source: "/about-us", destination: "/about", permanent: true },
      { source: "/team", destination: "/about", permanent: true },
      { source: "/blog", destination: "/resources", permanent: true },
      { source: "/blog/:slug", destination: "/resources/:slug", permanent: true },
      { source: "/news", destination: "/resources", permanent: true },
      { source: "/faqs", destination: "/faq", permanent: true },
      { source: "/questions", destination: "/faq", permanent: true },
      { source: "/dates", destination: "/deadlines", permanent: true },
      { source: "/tax-calendar", destination: "/deadlines", permanent: true },
      { source: "/contact-us", destination: "/contact", permanent: true },
      { source: "/book", destination: "/contact", permanent: true },
    ];
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
        ],
      },
    ];
  },
};

export default nextConfig;
