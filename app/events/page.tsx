import type { Metadata } from "next";
import ImageScroller from "@/components/ui/ImageScroller";
import { getEventsForScroller } from "@/lib/sanity/queries";
import Header from "@/components/landing/header";
import Footer from "@/components/landing/footer";

interface EventImageData {
  _id: string;
  title: string;
  slug: string;
  featuredImage: string;
  date?: string;
}

export const metadata: Metadata = {
  title: "Events | Djaouli Entertainment",
  description: "Explore upcoming events from Djaouli Entertainment",
};

export default async function EventsPage() {
  const events: EventImageData[] = await getEventsForScroller(10);

  // TODO: Handle case where events might be empty
  if (!events || events.length === 0) {
    return (
      <div className="container mx-auto py-12 px-4">
        <h1 className="text-4xl font-bold mb-8">Events</h1>
        <p>No upcoming events found.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <ImageScroller images={events} />
      <Footer />
    </div>
  );
}
