import Image from "next/image";
import { notFound } from "next/navigation";
import { CalendarDays, Clock, MapPin, Users, Ticket } from "lucide-react";
import Header from "@/components/landing/header";
import Footer from "@/components/landing/footer";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getEventBySlug } from "@/lib/sanity/queries";
import TicketSelector from "@/components/landing/ticket-selector";
import Link from "next/link";
import { EventShareButton } from "@/components/event/event-share-button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// Define specific type for TicketType
interface TicketTypeData {
  _key: string;
  name: string;
  ticketId: { current: string }; // Slug type
  price: number;
  description?: string;
  details?: string;
  stock?: number | null; // Allow null
  maxPerOrder?: number;
  salesStart?: string | null; // Allow null
  salesEnd?: string | null; // Allow null
  paymentLink?: string;
}

// Define specific type for Bundle
interface BundleData {
  _key: string;
  name: string;
  bundleId: { current: string }; // Slug type
  price: number;
  description?: string;
  details?: string;
  stock?: number | null; // Allow null
  paymentLink?: string;
  // Bundles don't have salesStart/End in schema, only stock
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
  ticketsAvailable?: boolean; // Master switch
  checkoutType: 'api' | 'link';
  paymentProductId?: string;
  ticketTypes?: TicketTypeData[];
  bundles?: BundleData[];
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

// Helper function to check ticket/bundle availability
const isAvailable = (item: { stock?: number | null; salesStart?: string | null; salesEnd?: string | null }): { available: boolean; reason: string } => {
  // Check stock
  if (typeof item.stock === 'number' && item.stock <= 0) {
    return { available: false, reason: "Sold Out" };
  }

  // Check sales dates (only relevant for ticketTypes based on current schema)
  const now = new Date();
  if (item.salesStart) {
    if (now < new Date(item.salesStart)) {
      // Format date nicely for the reason
      const startDate = new Date(item.salesStart).toLocaleDateString("en-GB", { day: 'numeric', month: 'short' });
      return { available: false, reason: `Starts ${startDate}` };
    }
  }
  if (item.salesEnd) {
    if (now > new Date(item.salesEnd)) {
      return { available: false, reason: "Sales Ended" };
    }
  }

  // If stock is undefined/null or > 0, and dates are okay, it's available
  return { available: true, reason: "" };
};

// Helper function for formatting price
const formatPrice = (price: number): string => {
  // Use non-breaking space (\u00A0) for thousands separator
  return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, "\u00A0");
};

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

  // Map EventData to the props expected by TicketSelector (API mode)
  const mapToTicketSelectorProps = (eventData: EventData) => {
    const ticketTypes = eventData.ticketTypes || [];
    const bundles = eventData.bundles || [];

    return {
      _id: eventData._id,
      title: eventData.title,
      ticketTypes: ticketTypes.map(tt => {
        const availability = isAvailable(tt); // Use helper
        return {
          id: tt.ticketId?.current || tt._key,
          name: tt.name,
          price: tt.price,
          description: tt.description || '',
          // Combine global switch and specific availability
          available: (eventData.ticketsAvailable === undefined || eventData.ticketsAvailable === true) && availability.available,
          maxPerOrder: tt.maxPerOrder || 10,
        };
      }),
      bundles: bundles.map(b => {
        const availability = isAvailable(b); // Use helper (checks stock only for bundles)
        return {
          id: b.bundleId?.current || b._key,
          name: b.name,
          price: b.price,
          description: b.description || '',
          includes: b.details?.split('\n').map(s => s.trim()).filter(Boolean) || ['See details'],
          // Combine global switch and specific availability
          available: (eventData.ticketsAvailable === undefined || eventData.ticketsAvailable === true) && availability.available,
          maxPerOrder: 10, // Bundles currently don't have maxPerOrder in schema, defaulting
        };
      }),
    };
  };

  // Prepare props specifically for TicketSelector if needed (API mode)
  const ticketSelectorProps = (event && event.checkoutType === 'api') ? mapToTicketSelectorProps(event) : null;

  // Determine if any tickets/bundles are available for purchase in Link mode
  const anyLinksAvailable = event.checkoutType === 'link' && (event.ticketsAvailable === undefined || event.ticketsAvailable === true) &&
    ((event.ticketTypes?.some(tt => isAvailable(tt).available && tt.paymentLink)) ||
      (event.bundles?.some(b => isAvailable(b).available && b.paymentLink)));

  return (
    <>
      <Header />
      <div className="container mx-auto py-22 px-4">
        <div className="grid grid-cols-1 lg:grid-cols-6 gap-8 lg:gap-12 items-start">
          {/* Event Flyer - Assign 2 columns */}
          <div className="lg:col-span-2 relative aspect-[2/3] rounded-sm overflow-hidden shadow-lg bg-muted">
            <Image
              src={event.flyer?.url || "/placeholder.svg"}
              alt={event.title}
              priority
              fill
              className="object-center"
            />
          </div>

          {/* Event Details - Assign 3 columns */}
          <div className="lg:col-span-4">
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
                  <span>Hosted by {event.hostedBy}</span>
                </div>
              )}
            </div>

            <Separator className="my-6" />

            {/* Tabs Section */}
            {/* Conditionally render based on checkoutType */}
            {event.checkoutType === 'api' ? (
              // API Checkout Mode: Show Tabs with Ticket Selector
              <Tabs defaultValue="tickets">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="tickets" className="rounded-sm">Tickets</TabsTrigger>
                  <TabsTrigger value="details" className="rounded-sm">Details</TabsTrigger>
                  <TabsTrigger value="venue" className="rounded-sm">Venue</TabsTrigger>
                  {/* Add Gallery/Lineup tabs if needed */}
                </TabsList>

                {/* Ticket Tab Content */}
                <TabsContent value="tickets" className="py-4">
                  <h2 className="text-xl font-semibold mb-4">Select tickets</h2>
                  {/* Use refined check considering ticketSelectorProps might be null */}
                  {event.ticketsAvailable !== false && ticketSelectorProps ? (
                    <TicketSelector event={ticketSelectorProps} />
                  ) : (
                    <div className="bg-secondary text-secondary-foreground p-4 rounded-sm">
                      <p className="font-medium">
                        {event.ticketsAvailable === false ? "Ticket sales are currently closed for this event." : "Tickets are currently unavailable for selection."}
                      </p>
                    </div>
                  )}
                </TabsContent>

                {/* Details Tab Content */}
                <TabsContent value="details" className="py-4">
                  <h2 className="text-xl font-semibold mb-4">Event details</h2>
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
                        {event.lineup.map((artist, index) => (
                          <li key={artist._key || index}>{artist.name}</li>
                          // Optionally display artist image/bio here
                        ))}
                      </ul>
                    </>
                  )}
                </TabsContent>

                {/* Venue Tab Content */}
                <TabsContent value="venue" className="py-4">
                  <h2 className="text-xl font-semibold mb-4">More information</h2>
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
                </TabsContent>

              </Tabs>
            ) : (
              // Link Checkout Mode: Show Direct Links
              <div className="py-4">
                {/* Overall Availability Check */}
                {event.ticketsAvailable === false ? (
                  <div className="bg-secondary text-secondary-foreground p-4 rounded-sm mb-6">
                    <p className="font-medium">Ticket sales are currently closed for this event.</p>
                  </div>
                ) : (
                  /* Render Tickets and Bundles */
                  // Use IIFE for cleaner conditional logic
                  (() => {
                    const hasTickets = (event.ticketTypes?.length ?? 0) > 0;
                    const hasBundles = (event.bundles?.length ?? 0) > 0;
                    const hasAnyItems = hasTickets || hasBundles;

                    if (hasAnyItems && !anyLinksAvailable) {
                      // Items exist, but none are available for purchase via link
                      return (
                        <div className="bg-secondary text-secondary-foreground p-4 rounded-sm">
                          <p className="font-medium">All tickets and bundles are currently unavailable.</p>
                        </div>
                      );
                    } else if (!hasAnyItems) {
                      // No items listed at all
                      return (
                        <div className="bg-secondary text-secondary-foreground p-4 rounded-sm">
                          <p className="font-medium">No tickets or bundles are currently listed for this event.</p>
                        </div>
                      );
                    } else {
                      // At least one item is available for purchase, render the lists AND the heading
                      return (
                        <>
                          <h2 className="text-xl font-semibold mb-4">Get Tickets</h2>
                          <div className="space-y-6"> {/* Increased spacing */}
                            {/* List Ticket Types */}
                            {hasTickets && (
                              <div className="space-y-3">
                                <h3 className="font-medium text-lg">Tickets</h3>
                                {event.ticketTypes?.map((ticket) => {
                                  const availability = isAvailable(ticket);
                                  // Can purchase if global switch is on, item is available, AND has a payment link
                                  const canPurchase = (event.ticketsAvailable === undefined || event.ticketsAvailable === true) && availability.available && ticket.paymentLink;

                                  return (
                                    <Card key={ticket._key}>
                                      <CardContent className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                        <div className="flex-grow">
                                          <h4 className="font-semibold">{ticket.name}</h4>
                                          {ticket.description && <p className="text-sm text-muted-foreground mt-0.5">{ticket.description}</p>}
                                          {/* Optionally show ticket details/perks */}
                                          {ticket.details && <p className="text-xs text-muted-foreground mt-1">{ticket.details}</p>}
                                          <p className="font-medium mt-2">{formatPrice(ticket.price)} FCFA</p>
                                        </div>
                                        <div className="flex-shrink-0 w-full sm:w-auto">
                                          {canPurchase ? (
                                            <Button asChild className="rounded-md w-full sm:w-auto">
                                              <Link href={ticket.paymentLink!} target="_blank" rel="noopener noreferrer">
                                                <Ticket className="mr-2 h-4 w-4" /> Buy Now
                                              </Link>
                                            </Button>
                                          ) : (
                                            <Badge variant="outline" className="text-sm w-full sm:w-auto justify-center py-2 px-3">
                                              {availability.reason || "Unavailable"}
                                            </Badge>
                                          )}
                                        </div>
                                      </CardContent>
                                    </Card>
                                  );
                                })}
                              </div>
                            )}

                            {/* List Bundles */}
                            {hasBundles && (
                              <div className="space-y-3">
                                <h3 className="font-medium text-lg">Bundles</h3>
                                {event.bundles?.map((bundle) => {
                                  const availability = isAvailable(bundle); // Bundles only check stock
                                  const canPurchase = (event.ticketsAvailable === undefined || event.ticketsAvailable === true) && availability.available && bundle.paymentLink;
                                  return (
                                    <Card key={bundle._key}>
                                      <CardContent className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                        <div className="flex-grow">
                                          <h4 className="font-semibold">{bundle.name}</h4>
                                          {bundle.description && <p className="text-sm text-muted-foreground mt-0.5">{bundle.description}</p>}
                                          {/* Display bundle details/inclusions */}
                                          {bundle.details && (
                                            <ul className="text-xs text-muted-foreground mt-1 space-y-0.5 list-disc list-inside">
                                              {bundle.details.split('\\n').map((item, idx) => item.trim() && <li key={idx}>{item.trim()}</li>)}
                                            </ul>
                                          )}
                                          <p className="font-medium mt-2">{formatPrice(bundle.price)} FCFA</p>
                                        </div>
                                        <div className="flex-shrink-0 w-full sm:w-auto">
                                          {canPurchase ? (
                                            <Button asChild className="rounded-md w-full sm:w-auto">
                                              <Link href={bundle.paymentLink!} target="_blank" rel="noopener noreferrer">
                                                <Ticket className="mr-2 h-4 w-4" /> Buy Now
                                              </Link>
                                            </Button>
                                          ) : (
                                            <Badge variant="outline" className="text-sm w-full sm:w-auto justify-center py-2 px-3">
                                              {availability.reason || "Unavailable"}
                                            </Badge>
                                          )}
                                        </div>
                                      </CardContent>
                                    </Card>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </>
                      );
                    }
                  })() // End IIFE
                )}
              </div>
            )}

            <Separator className="my-8" /> {/* Increased margin */}

            {/* Share Button */}
            <div className="flex items-center justify-start"> {/* Align start */}
              <EventShareButton eventTitle={event.title} eventSlug={event.slug.current} />
              {/* Add other actions if needed */}
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}


