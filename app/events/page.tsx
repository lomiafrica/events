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
  description?: string;
  ticketsAvailable?: boolean;
}

export const metadata: Metadata = {
  title: "Events",
  description: "Explore upcoming events from Djaouli Entertainment",
};

export default async function EventsPage() {
  const events: EventImageData[] = await getEventsForScroller(10);

  // Handle case where events might be empty
  if (!events || events.length === 0) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="container mx-auto py-20 px-4 flex-grow">
          <h1 className="text-4xl font-bold mb-8">Events</h1>
          <p>No upcoming events found.</p>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow">
        <ImageScroller images={events} />
      </main>
      <Footer />
    </div>
  );
}
