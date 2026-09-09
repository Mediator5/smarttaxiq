import type { Metadata } from "next";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import Analytics from "@/components/Analytics";
import StickyCallBar from "@/components/StickyCallBar";
import { services, site, streetLine } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name} — Tax Preparation, Planning & IRS Help`,
    template: `%s · ${site.name}`,
  },
  description: site.description,
  applicationName: site.name,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: site.name,
    title: `${site.name} — Tax Preparation, Planning & IRS Help`,
    description: site.description,
    url: site.url,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: `${site.name} — Tax Preparation, Planning & IRS Help`,
    description: site.description,
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  /**
   * `AccountingService` is a subtype of `LocalBusiness`, so this carries every
   * LocalBusiness property while telling Google what the business actually is.
   * Name, address and phone must match the Carter Cole site and the Google
   * Business Profile exactly — mismatched NAP is one of the few things that
   * measurably suppresses local ranking.
   */
  const schema = {
    "@context": "https://schema.org",
    "@type": "AccountingService",
    "@id": `${site.url}/#organization`,
    name: site.name,
    legalName: site.parentLegalName,
    alternateName: site.parentLegalName,
    description: site.description,
    disambiguatingDescription: site.divisionStatement,
    url: site.url,
    telephone: site.phone,
    email: site.email,
    priceRange: "$$",
    currenciesAccepted: "USD",
    foundingDate: String(site.founded),
    parentOrganization: {
      "@type": "Organization",
      name: site.parentLegalName,
      url: site.parentUrl,
    },
    founder: {
      "@type": "Person",
      name: site.preparer.name,
      jobTitle: site.preparer.role,
    },
    address: {
      "@type": "PostalAddress",
      streetAddress: streetLine,
      addressLocality: site.address.city,
      addressRegion: site.address.state,
      postalCode: site.address.zip,
      addressCountry: site.address.country,
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: 42.3853,
      longitude: -82.9401,
    },
    hasMap: site.googleMapsUrl,
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday"],
        opens: "09:30",
        closes: "17:00",
      },
    ],
    areaServed: [
      { "@type": "City", name: "Detroit" },
      { "@type": "State", name: "Michigan" },
      { "@type": "Country", name: "United States" },
    ],
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Tax services",
      itemListElement: services.map((s) => ({
        "@type": "Offer",
        itemOffered: { "@type": "Service", name: s.title, description: s.short },
      })),
    },
  };

  return (
    <html lang="en">
      <body>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-ink focus:px-5 focus:py-3 focus:text-white"
        >
          Skip to content
        </a>
        <Header />
        <main id="main">{children}</main>
        <Footer />
        <StickyCallBar />
        <Analytics />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      </body>
    </html>
  );
}
