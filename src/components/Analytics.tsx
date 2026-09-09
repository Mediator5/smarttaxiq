"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { captureAttribution, trackPhoneClicks } from "@/lib/analytics";

/**
 * Loads the measurement tags and starts attribution capture.
 *
 * Nothing renders and nothing loads until the corresponding ID is set in the
 * environment, so this is inert on a site that has not been connected to
 * analytics yet — and adding the ID later needs no code change.
 *
 * `afterInteractive` deliberately: analytics is never worth delaying the
 * first paint of a page whose job is to convert a visitor.
 */
export default function Analytics() {
  const ga = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  const ads = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID;
  const meta = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  const pathname = usePathname();

  // Capture the campaign on landing, and count phone taps everywhere.
  useEffect(() => {
    captureAttribution();
    return trackPhoneClicks();
  }, []);

  // App Router navigations do not reload the page, so GA would otherwise
  // record a single pageview per session and every internal page would look
  // like it had no traffic at all.
  useEffect(() => {
    if (!ga || typeof window === "undefined") return;
    window.gtag?.("event", "page_view", {
      page_path: pathname,
      page_location: window.location.href,
    });
  }, [ga, pathname]);

  if (!ga && !ads && !meta) return null;

  return (
    <>
      {(ga || ads) && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${ga ?? ads}`}
            strategy="afterInteractive"
          />
          <Script id="gtag-init" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              window.gtag = gtag;
              gtag('js', new Date());
              ${ga ? `gtag('config', '${ga}', { send_page_view: true });` : ""}
              ${ads ? `gtag('config', '${ads}');` : ""}
            `}
          </Script>
        </>
      )}

      {meta && (
        <Script id="meta-pixel" strategy="afterInteractive">
          {`
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window,document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${meta}');
            fbq('track', 'PageView');
          `}
        </Script>
      )}
    </>
  );
}
