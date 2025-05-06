import type { Metadata } from "next";
import Header from "@/components/landing/header";
import BackgroundVideo from "@/components/landing/BackgroundVideo";
import Footer from "@/components/landing/footer";
import OurCodeSection from "@/components/landing/djaouli-code";
import { getHomepageVideoUrl } from "@/lib/sanity/queries";

// Use the general site metadata for the home page
export const metadata: Metadata = {
  title: "Djaouli Ent. | An Alternative Music Project from Abidjan",
  description: "Breaking musical boundaries since 2022."
};

export default async function Home() {
  const videoUrl = await getHomepageVideoUrl();

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
    </>
  );
}
