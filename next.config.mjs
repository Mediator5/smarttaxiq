/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

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
