import type { Metadata } from "next"
import EventCard from "@/components/event-card"
import { getAllEvents } from "@/lib/sanity/queries"

// Define Event type to match EventCard props
interface Event {
  _id: string;
  title: string;
  slug: string;
  date: string;
  time: string;
  location: string;
  flyer: {
    url: string;
  };
  ticketsAvailable: boolean;
}

export const metadata: Metadata = {
  title: "Events | Djaouli Entertainment",
  description: "Browse and book tickets for upcoming events in Côte d'Ivoire",
}

export default async function EventsPage() {
  const events = await getAllEvents()

  return (
    <div className="container mx-auto py-12 px-4">
      <h1 className="text-4xl font-bold mb-8">Upcoming Events</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {events.map((event: Event) => (
          <EventCard key={event._id} event={event} />
        ))}
      </div>
    </div>
  )
}

