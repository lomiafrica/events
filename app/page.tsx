import type { Metadata } from "next";
import Header from "@/components/landing/header";
import { HeroSection } from "@/components/landing/hero-section";
import Footer from "@/components/landing/footer";
import {
  getHomepageContent,
  getHomepagePromoEvent,
} from "@/lib/sanity/queries";
import FloatingPromo from "@/components/landing/floating-promo";

// Use the general site metadata for the home page
export const metadata: Metadata = {
  title: "Djaouli Ent. | An Alternative Music Project from Abidjan",
  description: "Breaking musical boundaries since 2022.",
};

export default async function Home() {
  // Fetch homepage content server-side
  const homepageData = await getHomepageContent();
  const promoEventData = await getHomepagePromoEvent();
  return (
    <div className="min-h-screen bg-background text-foreground relative">
      <Header />
      {/* Use HeroSection with combined videos and featured events */}
      <HeroSection
        sanityHeroItems={homepageData?.heroContent}
        featuredEvents={homepageData?.featuredEvents}
      />
      <Footer />

      {/* Floating Promo - Renders if promoEventData is found and has a flyer and slug */}
      {promoEventData && promoEventData.flyerUrl && promoEventData.slug && (
        <FloatingPromo
          imageUrl={promoEventData.flyerUrl}
          href={`/events/${promoEventData.slug}`}
          title={promoEventData.title || "View Event"} // Use event title for alt text or a default
          // onClose can be implemented here if needed, e.g., to set a cookie to not show again
        />
      )}
    </div>
  );
}
