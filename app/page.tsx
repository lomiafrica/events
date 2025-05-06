import type { Metadata } from "next";
import Header from "@/components/landing/header";
import BackgroundVideo from "@/components/landing/BackgroundVideo";
import Footer from "@/components/landing/footer";
import OurCodeSection from "@/components/landing/djaouli-code";
import { getHomepageVideoUrl, getHomepagePromoEvent } from "@/lib/sanity/queries";
import FloatingPromo from '@/components/landing/floating-promo';

// Use the general site metadata for the home page
export const metadata: Metadata = {
  title: "Djaouli Ent. | An Alternative Music Project from Abidjan",
  description: "Breaking musical boundaries since 2022.",
};

export default async function Home() {
  const videoUrl = await getHomepageVideoUrl();
  const promoEventData = await getHomepagePromoEvent();

  return (
    <>
      <div className="relative h-screen overflow-hidden">
        <BackgroundVideo videoUrl={videoUrl} />
        <div className="relative z-10 h-full flex flex-col">
          <Header />
        </div>
      </div>
      <OurCodeSection />
      <Footer />

      {/* Floating Promo - Renders if promoEventData is found and has a flyer and slug */}
      {promoEventData && promoEventData.flyerUrl && promoEventData.slug && (
        <FloatingPromo
          imageUrl={promoEventData.flyerUrl}
          href={`/events/${promoEventData.slug}`}
          title={promoEventData.title || 'View Event'} // Use event title for alt text or a default
        // onClose can be implemented here if needed, e.g., to set a cookie to not show again
        />
      )}
    </>
  );
}
