import type { Metadata } from "next";
import Header from "@/components/landing/header";
import BackgroundVideo from "@/components/landing/BackgroundVideo";
import Footer from "@/components/landing/footer";

// Use the general site metadata for the home page
export const metadata: Metadata = {
  title: "Djaouli Entertainment | Underground Music Collective",
  description: "Breaking musical boundaries since 2022.",
};

export default async function Home() {
  return (
    <>
      <div className="relative h-screen overflow-hidden">
        <BackgroundVideo />
        <div className="relative z-10 h-full flex flex-col">
          <Header />
        </div>
      </div>
      <Footer />
    </>
  );
}
