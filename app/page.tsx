import type { Metadata } from "next";
import Header from "@/components/landing/header";
import { HeroSection } from "@/components/landing/hero-section";
import Footer from "@/components/landing/footer";
import {
  getHomepageContent,
  getHomepagePromoEvent,
  getLatestEventForHero,
} from "@/lib/sanity/queries";
import FloatingPromo from "@/components/landing/floating-promo";
import { EventsCarousel } from "@/components/home/events-carousel";
import { MerchCarousel } from "@/components/home/merch-carousel";

// Use the general site metadata for the home page
export const metadata: Metadata = {
  title: "Djaouli Ent. | An Alternative Music Project from Abidjan",
  description: "Breaking musical boundaries since 2022.",
};

export default async function Home() {
  // Fetch homepage content server-side
  const homepageData = await getHomepageContent();
  const promoEventData = await getHomepagePromoEvent();
  const latestEvent = await getLatestEventForHero();
  return (
    <div className="min-h-screen bg-background text-foreground relative">
      <Header />
      {/* Use HeroSection with combined videos and featured events */}
      <HeroSection
        sanityHeroItems={homepageData?.heroContent}
        featuredEvents={homepageData?.featuredEvents}
        latestEvent={latestEvent}
      />
      <EventsCarousel />
      <MerchCarousel />
      <Footer />

      {/* Floating Promo - Renders if promoEventData is found and has a flyer and slug */}
      {promoEventData &&
        promoEventData.flyerUrl &&
        promoEventData.slug &&
        promoEventData.slug !== latestEvent?.slug?.current && (
        <FloatingPromo
          imageUrl={promoEventData.flyerUrl}
          href={`/events/${promoEventData.slug}`}
          title={promoEventData.title || "View Event"}
        />
      )}
    </div>
  );
}
