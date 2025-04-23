import Image from "next/image";
import { notFound } from "next/navigation";
import { CalendarDays, Clock, MapPin, Share2, Users, Ticket } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getEventBySlug } from "@/lib/sanity/queries";
import TicketSelector from "@/components/landing/ticket-selector";
import Link from "next/link";

// Define specific type for TicketType
interface TicketTypeData {
  _key: string;
  name: string;
  ticketId: { current: string }; // Slug type
  price: number;
  description?: string;
  details?: string;
  stock?: number;
  maxPerOrder?: number;
  salesStart?: string;
  salesEnd?: string;
}

// Define specific type for Bundle
interface BundleData {
  _key: string;
  name: string;
  bundleId: { current: string }; // Slug type
  price: number;
  description?: string;
  details?: string;
  stock?: number;
}

// Updated EventData type
type EventData = {
  _id: string;
  title: string;
  subtitle?: string;
  slug: { current: string };
  date: string; // ISO datetime string
  location?: {
    venueName?: string;
    address?: string;
    googleMapsUrl?: string;
  };
  flyer?: { url: string };
  description?: string;
  venueDetails?: string;
  hostedBy?: string;
  ticketsAvailable?: boolean;
  paymentLink?: string;
  paymentProductId?: string;
  ticketTypes?: TicketTypeData[]; // Use specific type
  bundles?: BundleData[]; // Add bundles with specific type
  lineup?: { _key: string; name: string; bio?: string; image?: string; socialLink?: string }[];
  gallery?: { _key: string; url: string; caption?: string }[];
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const event: EventData | null = await getEventBySlug(slug);

  if (!event) {
    return {
      title: "Event Not Found",
    };
  }

  return {
    title: `${event.title} | Djaouli Entertainment`,
    // Use subtitle in description if available?
    description: event.subtitle || event.description || "Event details for Djaouli Entertainment",
  };
}

export default async function EventPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const event: EventData | null = await getEventBySlug(slug);

  if (!event) {
    notFound();
  }

  // Format Date and Time
  const eventDate = event.date ? new Date(event.date) : null;
  const formattedDate = eventDate?.toLocaleDateString("en-GB", {
    day: '2-digit', month: 'long', year: 'numeric'
  }) || 'Date TBC';
  const formattedTime = eventDate?.toLocaleTimeString("en-US", {
    hour: 'numeric', minute: '2-digit', hour12: true
  }) || 'Time TBC';

  // Map EventData to the props expected by TicketSelector
  const mapToTicketSelectorProps = (eventData: EventData) => {
    // Default values for safety
    const ticketTypes = eventData.ticketTypes || [];
    const bundles = eventData.bundles || [];

    return {
      _id: eventData._id,
      title: eventData.title, // Pass title even if unused by selector internal logic
      ticketTypes: ticketTypes.map(tt => ({
        id: tt.ticketId?.current || tt._key, // Use key as fallback id
        name: tt.name,
        price: tt.price,
        description: tt.description || '',
        available: typeof tt.stock === 'number' ? tt.stock > 0 : true, // Assume available if stock is not defined
        maxPerOrder: tt.maxPerOrder || 10, // Default maxPerOrder
      })),
      bundles: bundles.map(b => ({
        id: b.bundleId?.current || b._key, // Use key as fallback id
        name: b.name,
        price: b.price,
        description: b.description || '',
        // Attempt to split details into includes, or provide default
        includes: b.details?.split('\n').map(s => s.trim()).filter(Boolean) || ['See details'],
        available: typeof b.stock === 'number' ? b.stock > 0 : true, // Assume available if stock is not defined
        maxPerOrder: 10, // Provide a default maxPerOrder for bundles
      })),
    };
  };

  // Prepare props specifically for TicketSelector if needed
  const ticketSelectorProps = event ? mapToTicketSelectorProps(event) : null;

  return (
    // Add Header/Footer here if not in a layout file
    <div className="container mx-auto py-12 px-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12 items-start">
        {/* Event Flyer - Spans 1 column on lg screens */}
        <div className="lg:col-span-1 relative aspect-[2/3] rounded-md overflow-hidden shadow-lg">
          <Image
            src={event.flyer?.url || "/placeholder.svg?height=900&width=600"}
            alt={event.title}
            fill
            priority
            className="object-cover"
          />
        </div>

        {/* Event Details - Spans 2 columns on lg screens */}
        <div className="lg:col-span-2">
          {/* Title and Subtitle */}
          <h1 className="text-3xl md:text-4xl font-bold">{event.title}</h1>
          {event.subtitle && (
            <p className="text-xl md:text-2xl text-muted-foreground mt-1 mb-4">{event.subtitle}</p>
          )}

          {/* Date, Time, Location, Hosted By */}
          <div className="flex flex-col gap-3 mb-6">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-primary flex-shrink-0" />
              <span>{formattedDate}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary flex-shrink-0" />
              <span>{formattedTime}</span>
            </div>
            {event.location?.venueName && (
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary flex-shrink-0" />
                {/* Link to Google Maps if URL exists */}
                {event.location.googleMapsUrl ? (
                  <a href={event.location.googleMapsUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">
                    {event.location.venueName}
                    {event.location.address && <span className="text-sm text-muted-foreground block"> ({event.location.address})</span>}
                  </a>
                ) : (
                  <span>
                    {event.location.venueName}
                    {event.location.address && <span className="text-sm text-muted-foreground block"> ({event.location.address})</span>}
                  </span>
                )}
              </div>
            )}
            {event.hostedBy && (
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary flex-shrink-0" />
                <span>Hosted by: {event.hostedBy}</span>
              </div>
            )}
          </div>

          <Separator className="my-6" />

          {/* Tabs Section */}
          {/* Conditionally render Tickets Tab based on paymentLink */}
          {!event.paymentLink ? (
            <Tabs defaultValue="tickets">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="tickets">Tickets</TabsTrigger>
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="venue">Venue</TabsTrigger>
                {/* Add Gallery/Lineup tabs if needed */}
              </TabsList>

              {/* Ticket Tab Content */}
              <TabsContent value="tickets" className="py-4">
                <h2 className="text-xl font-semibold mb-4">Select Tickets</h2>
                {event.ticketsAvailable && ticketSelectorProps ? (
                  // Pass the mapped props, no type assertion needed now
                  <TicketSelector event={ticketSelectorProps} />
                ) : (
                  <div className="bg-secondary text-secondary-foreground p-4 rounded-md">
                    <p className="font-medium">Tickets are currently unavailable for this event.</p>
                  </div>
                )}
              </TabsContent>

              {/* Details Tab Content */}
              <TabsContent value="details" className="py-4">
                <h2 className="text-xl font-semibold mb-4">Event Details</h2>
                {event.description && (
                  <div className="prose prose-invert max-w-none mb-6">
                    <p>{event.description}</p>
                  </div>
                )}
                {/* Display Lineup */}
                {event.lineup && event.lineup.length > 0 && (
                  <>
                    <h3 className="text-lg font-semibold mb-2 mt-4">Lineup</h3>
                    <ul className="list-disc list-inside space-y-1">
                      {event.lineup.map(artist => (
                        <li key={artist._key}>{artist.name}</li>
                        // Optionally display artist image/bio here
                      ))}
                    </ul>
                  </>
                )}
              </TabsContent>

              {/* Venue Tab Content */}
              <TabsContent value="venue" className="py-4">
                <h2 className="text-xl font-semibold mb-4">Venue Information</h2>
                {event.location?.venueName && (
                  <p className="font-medium mb-1">{event.location.venueName}</p>
                )}
                {event.location?.address && (
                  <p className="text-muted-foreground mb-4">{event.location.address}</p>
                )}
                {event.venueDetails && (
                  <div className="prose prose-invert max-w-none">
                    <p>{event.venueDetails}</p>
                  </div>
                )}
                {/* Optional: Add Map back if needed */}
                {/* <div className="mt-6 h-[300px] bg-muted rounded-md relative">...Map...</div> */}
              </TabsContent>

            </Tabs>
          ) : (
            // Case: Direct Payment Link is provided
            <div className="py-4">
              <h2 className="text-xl font-semibold mb-4">Get Tickets</h2>
              <Button asChild size="lg" className="w-full md:w-auto">
                <Link href={event.paymentLink} target="_blank" rel="noopener noreferrer">
                  <Ticket className="mr-2 h-5 w-5" />
                  Buy Tickets Now
                </Link>
              </Button>
              <p className="text-sm text-muted-foreground mt-2">
                You will be redirected to our secure payment partner.
              </p>
            </div>
          )}


          <Separator className="my-8" /> {/* Increased margin */}

          {/* Share Button */}
          <div className="flex items-center justify-start"> {/* Align start */}
            <Button variant="outline" className="flex items-center gap-2">
              <Share2 className="h-4 w-4" />
              Share Event
            </Button>
            {/* Add other actions if needed */}
          </div>
        </div>
      </div>
    </div>
  );
}


