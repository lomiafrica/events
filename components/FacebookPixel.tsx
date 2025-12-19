"use client";

import Script from "next/script";

// Type declarations for Facebook Pixel
declare global {
  interface Window {
    fbq: (...args: unknown[]) => void;
    _fbq: unknown;
  }
}

// Facebook Pixel tracking functions
const getTrafficSource = (): {
  source: string;
  medium: string;
  campaign: string;
  type: string;
} => {
  if (typeof document === "undefined") {
    return {
      source: "unknown",
      medium: "unknown",
      campaign: "none",
      type: "unknown",
    };
  }

  const referrer = document.referrer;
  const url = new URL(window.location.href);

  // Check UTM parameters first
  const utmSource = url.searchParams.get("utm_source");
  const utmMedium = url.searchParams.get("utm_medium");
  const utmCampaign = url.searchParams.get("utm_campaign");

  if (utmSource) {
    return {
      source: utmSource,
      medium: utmMedium || "unknown",
      campaign: utmCampaign || "unknown",
      type: "utm",
    };
  }

  // Check referrer patterns
  if (!referrer)
    return {
      source: "direct",
      medium: "direct",
      campaign: "none",
      type: "direct",
    };

  if (
    referrer.includes("google.com") ||
    referrer.includes("bing.com") ||
    referrer.includes("yahoo.com")
  ) {
    return {
      source: "organic_search",
      medium: "organic",
      campaign: "none",
      type: "search",
    };
  }

  if (
    referrer.includes("facebook.com") ||
    referrer.includes("instagram.com") ||
    referrer.includes("fb.com")
  ) {
    return {
      source: "facebook",
      medium: "social",
      campaign: "none",
      type: "social",
    };
  }

  if (referrer.includes("twitter.com") || referrer.includes("t.co")) {
    return {
      source: "twitter",
      medium: "social",
      campaign: "none",
      type: "social",
    };
  }

  if (referrer.includes("youtube.com") || referrer.includes("youtu.be")) {
    return {
      source: "youtube",
      medium: "video",
      campaign: "none",
      type: "social",
    };
  }

  // Other referrers
  try {
    const referrerDomain = new URL(referrer).hostname;
    return {
      source: referrerDomain,
      medium: "referral",
      campaign: "none",
      type: "referral",
    };
  } catch {
    return {
      source: "unknown",
      medium: "unknown",
      campaign: "none",
      type: "unknown",
    };
  }
};

// Facebook Pixel event parameters type
type FacebookPixelParameters = Record<
  string,
  string | number | boolean | string[] | undefined
>;

export const trackEvent = (
  eventName: string,
  parameters?: FacebookPixelParameters,
) => {
  if (typeof window !== "undefined" && window.fbq) {
    // Add automatic source tracking
    const trafficSource = getTrafficSource();
    const enhancedParams = {
      ...parameters,
      source_url: window.location.href,
      referrer: document.referrer,
      user_agent: navigator.userAgent,
      traffic_source: trafficSource.source,
      traffic_medium: trafficSource.medium,
      traffic_campaign: trafficSource.campaign,
      traffic_type: trafficSource.type,
    };

    window.fbq("track", eventName, enhancedParams);
  }
};

export const trackPurchase = (
  value: number,
  currency: string = "USD",
  contentIds?: string[],
) => {
  trackEvent("Purchase", {
    value,
    currency,
    content_ids: contentIds,
    content_type: "product",
  });
};

export const trackAddToCart = (
  value?: number,
  currency: string = "USD",
  contentIds?: string[],
) => {
  trackEvent("AddToCart", {
    value,
    currency,
    content_ids: contentIds,
    content_type: "product",
  });
};

export const trackViewContent = (
  contentType: string,
  contentIds?: string[],
) => {
  trackEvent("ViewContent", {
    content_ids: contentIds,
    content_type: contentType,
  });
};

export const trackTrafficSource = (
  source: string,
  campaign?: string,
  medium?: string,
) => {
  trackEvent("ViewContent", {
    content_category: "traffic_source",
    custom_source: source,
    custom_campaign: campaign,
    custom_medium: medium,
  });
};

export function FacebookPixel() {
  return (
    <>
      <Script
        id="facebook-pixel"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '739082995305324');
            fbq('track', 'PageView');
          `,
        }}
      />
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          height={1}
          width={1}
          style={{ display: "none" }}
          src="https://www.facebook.com/tr?id=739082995305324&ev=PageView&noscript=1"
          alt=""
        />
      </noscript>
    </>
  );
}
