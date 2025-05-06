import Image from "next/image";
import { notFound } from "next/navigation";
import { CalendarDays, Clock, MapPin, Users, Ticket } from "lucide-react";
import Header from "@/components/landing/header";
import Footer from "@/components/landing/footer";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { getEventBySlug } from "@/lib/sanity/queries";
import Link from "next/link";
import { EventShareButton } from "@/components/event/event-share-button";
import { YangoButton } from "@/components/event/YangoButton";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { t } from "@/lib/i18n/translations";

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
  active: boolean; // Added active field
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
  active: boolean; // Added active field
  salesStart?: string | null; // Added salesStart for bundles
  salesEnd?: string | null; // Added salesEnd for bundles
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
    yangoUrl?: string; // Added Yango URL
  };
  flyer?: { url: string };
  description?: string;
  venueDetails?: string;
  hostedBy?: string;
  ticketsAvailable?: boolean; // Master switch
  ticketTypes?: TicketTypeData[];
  bundles?: BundleData[];
  lineup?: {
    _key: string;
    name: string;
    bio?: string;
    image?: string;
    socialLink?: string;
  }[];
  gallery?: { _key: string; url: string; caption?: string }[];
};

// Helper to get locale (consistent with other page)
const getPageLocale = (params?: { slug?: string; locale?: string }): string => {
  return params?.locale || process.env.NEXT_PUBLIC_DEFAULT_LOCALE || "en";
};

export async function generateMetadata({ params }: { params: { slug: string; locale?: string } }) {
  const currentLanguage = getPageLocale(params);
  const { slug } = params;
  const event: EventData | null = await getEventBySlug(slug);

  if (!event) {
    return {
      title: t(currentLanguage, "eventSlugPage.metadata.notFoundTitle"),
    };
  }

  return {
    title: `${event.title}`,
    description: event.subtitle || event.description,
  };
}

// Helper function to check ticket/bundle availability
// Renamed and updated to include 'active' status and handle items consistently
interface ItemForAvailabilityCheck {
  active: boolean;
  stock?: number | null;
  salesStart?: string | null;
  salesEnd?: string | null;
}

const getItemAvailabilityStatus = (
  item: ItemForAvailabilityCheck,
  currentLanguage: string
): { available: boolean; reason: string } => {
  if (!item.active) {
    return { available: false, reason: t(currentLanguage, "eventSlugPage.availability.inactive") };
  }
  if (typeof item.stock === "number" && item.stock <= 0) {
    return { available: false, reason: t(currentLanguage, "eventSlugPage.availability.soldOut") };
  }
  const now = new Date();
  if (item.salesStart && now < new Date(item.salesStart)) {
    const startDate = new Date(item.salesStart).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    return { available: false, reason: t(currentLanguage, "eventSlugPage.availability.salesStart", { startDate }) };
  }
  if (item.salesEnd && now > new Date(item.salesEnd)) {
    return { available: false, reason: t(currentLanguage, "eventSlugPage.availability.salesEnded") };
  }
  return { available: true, reason: "" }; // Default is available if no other condition met
};

// Helper function for formatting price
const formatPrice = (price: number): string => {
  // Use non-breaking space (\u00A0) for thousands separator
  return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, "\u00A0");
};

export default async function EventPage({ params }: { params: { slug: string; locale?: string } }) {
  const currentLanguage = getPageLocale(params);
  const { slug } = params;
  const event: EventData | null = await getEventBySlug(slug);

  if (!event) {
    notFound();
  }

  // Format Date and Time
  const eventDate = event.date ? new Date(event.date) : null;
  const formattedDate =
    eventDate?.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }) || t(currentLanguage, "eventSlugPage.dateTBC");
  const formattedTime =
    eventDate?.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }) || t(currentLanguage, "eventSlugPage.timeTBC");

  // Simplified availability check for the main "Get Tickets" section
  const globallyTicketsOnSale =
    event.ticketsAvailable === undefined || event.ticketsAvailable === true;
  const hasDefinedTickets = (event.ticketTypes?.length ?? 0) > 0;
  const hasDefinedBundles = (event.bundles?.length ?? 0) > 0;
  const hasAnyDefinedItems = hasDefinedTickets || hasDefinedBundles;

  return (
    <>
      <Header />
      <div className="container mx-auto py-22 px-4">
        <div className="grid grid-cols-1 lg:grid-cols-6 gap-8 lg:gap-12 items-start">
          {/* Event Flyer - Assign 2 columns */}
          <div className="lg:col-span-2 relative aspect-[2/3] rounded-sm overflow-hidden shadow-lg bg-muted">
            <Image
              src={event.flyer?.url || "/placeholder.webp"}
              alt={event.title}
              priority
              fill
              className="object-center"
            />
          </div>

          {/* Event Details - Assign 3 columns */}
          <div className="lg:col-span-4">
            {/* Title and Subtitle */}
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-3">
              {event.title}
            </h1>
            {event.subtitle && (
              <p className="text-xl md:text-2xl text-slate-300 mt-1 mb-6">
                {event.subtitle}
              </p>
            )}

            {/* Date, Time, Location, Hosted By */}
            <div className="flex flex-col gap-4 mb-8">
              <div className="flex items-center gap-3">
                <CalendarDays className="h-6 w-6 text-primary flex-shrink-0" />
                <span className="text-lg text-gray-200">{formattedDate}</span>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="h-6 w-6 text-primary flex-shrink-0" />
                <span className="text-lg text-gray-200">{formattedTime}</span>
              </div>
              {event.location?.venueName && (
                <div className="flex items-center gap-3">
                  <MapPin className="h-6 w-6 text-primary flex-shrink-0" />
                  <div className="flex items-center gap-2 flex-wrap text-base">
                    {event.location.googleMapsUrl ? (
                      <a
                        href={event.location.googleMapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline"
                      >
                        <span className="font-semibold text-gray-100">
                          {event.location.venueName}
                        </span>
                        {event.location.address && (
                          <span className="text-sm text-slate-400 block">
                            {" "}
                            ({event.location.address})
                          </span>
                        )}
                      </a>
                    ) : (
                      <span>
                        <span className="font-semibold text-gray-100">
                          {event.location.venueName}
                        </span>
                        {event.location.address && (
                          <span className="text-sm text-slate-400 block">
                            {" "}
                            ({event.location.address})
                          </span>
                        )}
                      </span>
                    )}
                    {event.location.yangoUrl && (
                      <>
                        <span className="text-muted-foreground">|</span>
                        <YangoButton href={event.location.yangoUrl} />
                      </>
                    )}
                  </div>
                </div>
              )}
              {event.hostedBy && (
                <div className="flex items-center gap-3">
                  <Users className="h-6 w-6 text-primary flex-shrink-0" />
                  <span className="text-lg text-gray-200">
                    {t(currentLanguage, "eventSlugPage.hostedBy", { name: event.hostedBy })}
                  </span>
                </div>
              )}
            </div>

            <Separator className="my-6" />

            {/* Tickets/Bundles Section - Always Link Checkout Mode Logic */}
            <div className="py-4">
              {!globallyTicketsOnSale ? (
                <div className="bg-secondary text-secondary-foreground p-4 rounded-sm mb-6">
                  <p className="font-medium">
                    {t(currentLanguage, "eventSlugPage.tickets.salesClosedGlobal")}
                  </p>
                </div>
              ) : !hasAnyDefinedItems ? (
                <div className="bg-secondary text-secondary-foreground p-4 rounded-sm">
                  <p className="font-medium">
                    {t(currentLanguage, "eventSlugPage.tickets.noItemsListed")}
                  </p>
                </div>
              ) : (
                <>
                  <h2 className="text-2xl font-bold text-gray-100 mb-4 tracking-tight">
                    {t(currentLanguage, "eventSlugPage.tickets.title")}
                  </h2>
                  <div className="space-y-6 mt-6">
                    {/* List Ticket Types */}
                    {hasDefinedTickets && (
                      <div className="space-y-3">
                        {event.ticketTypes?.map((ticket) => {
                          const availabilityStatus =
                            getItemAvailabilityStatus(ticket, currentLanguage);
                          const canPurchase =
                            globallyTicketsOnSale &&
                            availabilityStatus.available &&
                            ticket.paymentLink;

                          return (
                            <Card
                              key={ticket._key}
                              className="border-slate-700 bg-background shadow-lg rounded-sm overflow-hidden flex flex-col"
                            >
                              {/* Mimicking djaouli-code.tsx structure - outer div with pattern (simplified here) & inner with gradient (simplified here) */}
                              <div className="size-full bg-repeat p-1 bg-[length:20px_20px]">
                                <div className="size-full bg-gradient-to-br from-background/95 via-background/85 to-background/70 rounded-sm p-3 flex flex-col flex-grow">
                                  <CardContent className="p-0 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 flex-grow w-full">
                                    <div className="flex-grow">
                                      <h4 className="text-gray-100 font-bold text-base uppercase leading-tight mb-2">
                                        {ticket.name.replace(
                                          /\s*\(\d+(\s*\w+)?\)$/,
                                          "",
                                        )}
                                      </h4>
                                      {ticket.description && (
                                        <p className="text-gray-400 italic text-sm leading-relaxed mb-1">
                                          {ticket.description}
                                        </p>
                                      )}
                                      {ticket.details && (
                                        <p className="text-xs text-gray-400/80 leading-relaxed mb-2">
                                          {ticket.details}
                                        </p>
                                      )}
                                      <p className="text-primary font-semibold mt-2 text-lg">
                                        {formatPrice(ticket.price)}{t(currentLanguage, "eventSlugPage.tickets.currencySuffix")}
                                      </p>
                                    </div>
                                    <div className="flex-shrink-0 w-full sm:w-auto mt-3 sm:mt-0">
                                      {canPurchase ? (
                                        <Button
                                          asChild
                                          className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white rounded-sm"
                                        >
                                          <Link
                                            href={ticket.paymentLink!}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                          >
                                            <Ticket className="mr-2 h-4 w-4" />{" "}
                                            {t(currentLanguage, "eventSlugPage.tickets.buyNow")}
                                          </Link>
                                        </Button>
                                      ) : (
                                        <Badge
                                          variant="outline"
                                          className="text-sm w-full sm:w-auto justify-center py-2 px-3 border-slate-600 text-slate-400 rounded-sm"
                                        >
                                          {availabilityStatus.reason ||
                                            t(currentLanguage, "eventSlugPage.availability.unavailable")}
                                        </Badge>
                                      )}
                                    </div>
                                  </CardContent>
                                </div>
                              </div>
                            </Card>
                          );
                        })}
                      </div>
                    )}

                    {/* List Bundles */}
                    {hasDefinedBundles && (
                      <div className="space-y-3">
                        <h3 className="font-medium text-lg">{t(currentLanguage, "eventSlugPage.bundles.title")}</h3>
                        {event.bundles?.map((bundle) => {
                          const availabilityStatus =
                            getItemAvailabilityStatus(bundle, currentLanguage);
                          const canPurchase =
                            globallyTicketsOnSale &&
                            availabilityStatus.available &&
                            bundle.paymentLink;
                          return (
                            <Card
                              key={bundle._key}
                              className="border-slate-700 bg-background shadow-lg rounded-sm overflow-hidden flex flex-col"
                            >
                              <div className="size-full bg-repeat p-1 bg-[length:20px_20px]">
                                <div className="size-full bg-gradient-to-br from-background/95 via-background/85 to-background/70 rounded-sm p-3 flex flex-col flex-grow">
                                  <CardContent className="p-0 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 flex-grow w-full">
                                    <div className="flex-grow">
                                      <h4 className="text-gray-100 font-bold text-base uppercase leading-tight mb-2">
                                        {bundle.name.replace(
                                          /\s*\(\d+(\s*\w+)?\)$/,
                                          "",
                                        )}
                                      </h4>
                                      {bundle.description && (
                                        <p className="text-gray-400 italic text-sm leading-relaxed mb-1">
                                          {bundle.description}
                                        </p>
                                      )}
                                      {bundle.details && (
                                        <ul className="text-xs text-gray-400/80 leading-relaxed list-disc list-inside mb-2 space-y-0.5">
                                          {bundle.details
                                            .split("\n")
                                            .map(
                                              (item, idx) =>
                                                item.trim() && (
                                                  <li key={idx}>
                                                    {item.trim()}
                                                  </li>
                                                ),
                                            )}
                                        </ul>
                                      )}
                                      <p className="text-primary font-semibold mt-2 text-lg">
                                        {formatPrice(bundle.price)}{t(currentLanguage, "eventSlugPage.tickets.currencySuffix")}
                                      </p>
                                    </div>
                                    <div className="flex-shrink-0 w-full sm:w-auto mt-3 sm:mt-0">
                                      {canPurchase ? (
                                        <Button
                                          asChild
                                          className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white rounded-sm"
                                        >
                                          <Link
                                            href={bundle.paymentLink!}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                          >
                                            <Ticket className="mr-2 h-4 w-4" />{" "}
                                            {t(currentLanguage, "eventSlugPage.tickets.buyNow")}
                                          </Link>
                                        </Button>
                                      ) : (
                                        <Badge
                                          variant="outline"
                                          className="text-sm w-full sm:w-auto justify-center py-2 px-3 border-slate-600 text-slate-400 rounded-sm"
                                        >
                                          {availabilityStatus.reason ||
                                            t(currentLanguage, "eventSlugPage.availability.unavailable")}
                                        </Badge>
                                      )}
                                    </div>
                                  </CardContent>
                                </div>
                              </div>
                            </Card>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Event Details, Venue, Lineup, Gallery - No longer in Tabs, shown sequentially or based on data presence */}
            {event.description && (
              <div className="mb-10 pt-6">
                <h2 className="text-2xl font-bold text-gray-100 mb-4 tracking-tight">
                  {t(currentLanguage, "eventSlugPage.detailsSection.title")}
                </h2>
                <div className="prose prose-sm sm:prose dark:prose-invert max-w-none text-gray-300 leading-relaxed mt-1">
                  <p>{event.description}</p>
                </div>
              </div>
            )}

            {event.lineup && event.lineup.length > 0 && (
              <div className="mb-10 pt-6">
                <h2 className="text-2xl font-bold text-gray-100 mb-4 tracking-tight">
                  {t(currentLanguage, "eventSlugPage.lineupSection.title")}
                </h2>
                <ul className="space-y-2 mt-2">
                  {event.lineup.map((artist, index) => (
                    <li
                      key={artist._key || index}
                      className="text-gray-200 flex items-center py-1"
                    >
                      <span className="text-primary mr-3">◆</span>
                      {artist.name}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {(event.location?.venueName ||
              event.location?.address ||
              event.venueDetails) && (
                <div className="mb-10 pt-6">
                  <h2 className="text-2xl font-bold text-gray-100 mb-4 tracking-tight">
                    {t(currentLanguage, "eventSlugPage.venueSection.title")}
                  </h2>
                  {event.location?.venueName && (
                    <p className="font-semibold text-gray-100 text-lg mt-2 mb-1">
                      {event.location.venueName}
                    </p>
                  )}
                  {event.location?.address && (
                    <p className="text-slate-400 mb-4">
                      {event.location.address}
                    </p>
                  )}
                  {event.venueDetails && (
                    <div className="prose prose-sm sm:prose dark:prose-invert max-w-none text-gray-300 leading-relaxed mt-1">
                      <p>{event.venueDetails}</p>
                    </div>
                  )}
                </div>
              )}

            {/* Share Button - Separator above it if content sections were present */}
            {(event.description ||
              (event.lineup && event.lineup.length > 0) ||
              event.location?.venueName ||
              event.location?.address ||
              event.venueDetails) && <Separator className="my-10" />}
            <div className="flex items-center justify-end">
              <EventShareButton
                eventTitle={event.title}
                eventSlug={event.slug.current}
              />
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
