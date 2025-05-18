"use client";

import { useState, useEffect } from 'react';
import Image from "next/image";
import { notFound } from "next/navigation";
import { CalendarDays, Clock, MapPin, Users, Ticket, Check } from "lucide-react";
import Header from "@/components/landing/header";
import Footer from "@/components/landing/footer";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { getEventBySlug } from "@/lib/sanity/queries";
import { EventShareButton } from "@/components/event/event-share-button";
import { YangoButton } from "@/components/event/YangoButton";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { t } from "@/lib/i18n/translations";
import ArtistHoverCard from '@/components/event/ArtistHoverCard';
import PurchaseFormModal from '@/components/event/PurchaseFormModal';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Define the shape of the ticket/bundle item passed to the modal (ensure this matches PurchaseFormModal's expectation)
interface PurchaseItem {
  id: string; // Sanity _key or bundleId.current
  name: string;
  price: number;
  isBundle: boolean;
  maxPerOrder?: number;
  stock?: number | null;
}

// Define specific type for TicketType
interface TicketTypeData {
  _key: string;
  name: string;
  price: number;
  description?: string;
  details?: string;
  stock?: number | null;
  maxPerOrder?: number;
  salesStart?: string | null;
  salesEnd?: string | null;
  active?: boolean;
}

// Define specific type for Bundle
interface BundleData {
  _key: string;
  name: string;
  bundleId: { current: string };
  price: number;
  description?: string;
  details?: string;
  stock?: number | null;
  maxPerOrder?: number;
  active: boolean;
  salesStart?: string | null;
  salesEnd?: string | null;
}

// Updated EventData type
type EventData = {
  _id: string;
  title: string;
  subtitle?: string;
  slug: { current: string };
  date: string;
  location?: {
    venueName?: string;
    address?: string;
    googleMapsUrl?: string;
    yangoUrl?: string;
  };
  flyer?: { url: string };
  description?: string;
  venueDetails?: string;
  hostedBy?: string;
  ticketsAvailable?: boolean;
  ticketTypes?: TicketTypeData[];
  bundles?: BundleData[];
  lineup?: {
    _id: string;
    name: string;
    bio?: string;
    image?: string;
    socialLink?: string;
    isResident?: boolean;
  }[];
  gallery?: { _key: string; url: string; caption?: string }[];
};

// Supabase client setup (move to a utility file if used elsewhere)
// Ensure these environment variables are available on the client-side if you initialize here
// OR pass the initialized client from a server component if preferred for security of URLs/keys
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
// It's generally recommended to initialize Supabase client once and export it from a utility file.
// For this example, initializing here for simplicity assuming NEXT_PUBLIC vars are set.
let supabase: SupabaseClient | null = null;
try {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
} catch (error) {
  console.error("Failed to initialize Supabase client:", error);
  // Handle error appropriately, maybe show a message to the user or disable purchase functionality
}

const getPageLocale = (params?: { slug?: string; locale?: string }): string => {
  return params?.locale || process.env.NEXT_PUBLIC_DEFAULT_LOCALE || "en";
};

export async function generateMetadata({ params: paramsPromise }: { params: Promise<{ slug: string; locale?: string }> }) {
  const params = await paramsPromise;
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

interface ItemForAvailabilityCheck {
  active?: boolean;
  stock?: number | null;
  salesStart?: string | null;
  salesEnd?: string | null;
}

const getItemAvailabilityStatus = (
  item: ItemForAvailabilityCheck,
  currentLanguage: string
): { available: boolean; reason: string } => {
  if (typeof item.active === 'boolean' && !item.active) {
    return { available: false, reason: t(currentLanguage, "eventSlugPage.availability.inactive") };
  }
  if (typeof item.stock === "number" && item.stock <= 0) {
    return { available: false, reason: t(currentLanguage, "eventSlugPage.availability.soldOut") };
  }
  const now = new Date();
  if (item.salesStart && now < new Date(item.salesStart)) {
    const startDate = new Date(item.salesStart).toLocaleDateString("en-GB", {
      day: "numeric", month: "short", year: "numeric",
    });
    return { available: false, reason: t(currentLanguage, "eventSlugPage.availability.salesStart", { startDate }) };
  }
  if (item.salesEnd && now > new Date(item.salesEnd)) {
    return { available: false, reason: t(currentLanguage, "eventSlugPage.availability.salesEnded") };
  }
  return { available: true, reason: "" };
};

const formatPrice = (price: number): string => {
  return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, "\u00A0");
};

export default function EventPage({ params: paramsPromise }: { params: Promise<{ slug: string; locale?: string }> }) {
  const [event, setEvent] = useState<EventData | null>(null);
  const [currentLanguage, setCurrentLanguage] = useState<string>("en");
  const [isLoadingPage, setIsLoadingPage] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<PurchaseItem | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const params = await paramsPromise;
        const lang = getPageLocale(params);
        setCurrentLanguage(lang);
        const eventData = await getEventBySlug(params.slug);
        if (!eventData) {
          notFound();
          return;
        }
        setEvent(eventData);
      } catch (err) {
        console.error("Failed to fetch event data:", err);
        notFound(); // Or some other error handling
      } finally {
        setIsLoadingPage(false);
      }
    }
    fetchData();
  }, [paramsPromise]);

  const handleOpenPurchaseModal = (item: PurchaseItem) => {
    if (!supabase) {
      alert(t(currentLanguage, "eventSlugPage.errors.supabaseNotInitialized")); // Or a more graceful notification
      console.error("Supabase client not initialized. Cannot open purchase modal.");
      return;
    }
    setSelectedItem(item);
    setIsModalOpen(true);
  };

  if (isLoadingPage || !event) {
    // Optional: Add a more sophisticated loading skeleton here
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="container mx-auto py-20 px-4 flex-grow flex items-center justify-center">
          <p>{t(currentLanguage, "eventSlugPage.loading")}</p> {/* Add loading translation */}
        </main>
        <Footer />
      </div>
    );
  }

  const eventDate = event.date ? new Date(event.date) : null;
  const formattedDate =
    eventDate?.toLocaleDateString(currentLanguage === 'fr' ? 'fr-FR' : 'en-GB', {
      day: "2-digit", month: "long", year: "numeric",
    }) || t(currentLanguage, "eventSlugPage.dateTBC");
  const formattedTime =
    eventDate?.toLocaleTimeString(currentLanguage === 'fr' ? 'fr-FR' : 'en-US', {
      hour: "numeric", minute: "2-digit", hour12: currentLanguage !== 'fr',
    }) || t(currentLanguage, "eventSlugPage.timeTBC");

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
          {/* Event Flyer */}
          <div className="lg:col-span-2 relative aspect-[2/3] rounded-sm overflow-hidden shadow-lg bg-muted">
            <Image
              src={event.flyer?.url || "/placeholder.webp"}
              alt={event.title}
              priority
              fill
              className="object-center"
            />
          </div>

          {/* Event Details */}
          <div className="lg:col-span-4">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-3">
              {event.title}
            </h1>
            {event.subtitle && (
              <p className="text-xl md:text-2xl text-slate-300 mt-1 mb-6">
                {event.subtitle}
              </p>
            )}
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

            {/* Tickets/Bundles Section - Updated Logic */}
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

                          return (
                            <Card
                              key={ticket._key}
                              className="border-slate-700 bg-background shadow-lg rounded-sm overflow-hidden flex flex-col"
                            >
                              <div className="size-full bg-repeat p-1 bg-[length:20px_20px]">
                                <div className="size-full bg-gradient-to-br from-background/95 via-background/85 to-background/70 rounded-sm py-2 px-3 flex flex-col flex-grow">
                                  <CardContent className="p-0 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 flex-grow w-full">
                                    <div className="flex-grow">
                                      <h4 className="text-gray-100 font-bold text-base uppercase leading-tight mb-2">
                                        {ticket.name.replace(
                                          /\s*\(\d+(\s*\w+)?\)$/,
                                          "",
                                        )}
                                      </h4>
                                      {ticket.description && (
                                        <div className="text-sm mb-1 space-y-1">
                                          {ticket.description.split('\n').map((line, index) => {
                                            const trimmedLine = line.trim();
                                            if (trimmedLine === "") {
                                              return <br key={index} />;
                                            }
                                            if (trimmedLine.startsWith("⚠️")) {
                                              return (
                                                <p key={index} className="text-amber-400 font-medium">
                                                  {trimmedLine}
                                                </p>
                                              );
                                            }
                                            return <p key={index} className="text-gray-400 leading-relaxed">{trimmedLine}</p>;
                                          })}
                                        </div>
                                      )}
                                      {ticket.details && (
                                        <div className="text-xs text-gray-400/80 my-2 space-y-1">
                                          {ticket.details.split('\n').map((line, idx) => {
                                            const trimmedLine = line.trim();
                                            if (trimmedLine === "") {
                                              return <br key={idx} />;
                                            }
                                            const match = trimmedLine.match(/^(✅|✔|•|-|\*)\s*(.*)/);
                                            if (match && match[2]) {
                                              return (
                                                <div key={idx} className="flex items-start pl-2">
                                                  <Check className="mr-1.5 h-3.5 w-3.5 text-green-500 flex-shrink-0 mt-[1px]" />
                                                  <span className="leading-snug">{match[2]}</span>
                                                </div>
                                              );
                                            }
                                            return (
                                              <p key={idx} className="leading-snug ml-[calc(0.375rem+0.875rem)]">
                                                {trimmedLine}
                                              </p>
                                            );
                                          })}
                                        </div>
                                      )}
                                      <p className="text-primary font-semibold mt-3 text-lg">
                                        {formatPrice(ticket.price)}{t(currentLanguage, "eventSlugPage.tickets.currencySuffix")}
                                      </p>
                                    </div>
                                    <div className="flex-shrink-0 w-full sm:w-auto mt-3 sm:mt-0">
                                      {globallyTicketsOnSale && availabilityStatus.available ? (
                                        <Button
                                          onClick={() => handleOpenPurchaseModal({
                                            id: ticket._key,
                                            name: ticket.name,
                                            price: ticket.price,
                                            isBundle: false,
                                            maxPerOrder: ticket.maxPerOrder,
                                            stock: ticket.stock,
                                          })}
                                          className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white rounded-sm"
                                        >
                                          <Ticket className="mr-2 h-4 w-4" />
                                          {t(currentLanguage, "eventSlugPage.tickets.getETicket")}
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

                    {/* List Bundles - Updated Logic */}
                    {hasDefinedBundles && (
                      <div className="space-y-3">
                        <h3 className="font-medium text-lg">{t(currentLanguage, "eventSlugPage.bundles.title")}</h3>
                        {event.bundles?.map((bundle) => {
                          const availabilityStatus =
                            getItemAvailabilityStatus(bundle, currentLanguage);

                          return (
                            <Card
                              key={bundle._key}
                              className="border-slate-700 bg-background shadow-lg rounded-sm overflow-hidden flex flex-col"
                            >
                              <div className="size-full bg-repeat p-1 bg-[length:20px_20px]">
                                <div className="size-full bg-gradient-to-br from-background/95 via-background/85 to-background/70 rounded-sm py-2 px-3 flex flex-col flex-grow">
                                  <CardContent className="p-0 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 flex-grow w-full">
                                    <div className="flex-grow">
                                      <h4 className="text-gray-100 font-bold text-base uppercase leading-tight mb-2">
                                        {bundle.name.replace(
                                          /\s*\(\d+(\s*\w+)?\)$/,
                                          "",
                                        )}
                                      </h4>
                                      {bundle.description && (
                                        <div className="text-sm mb-1 space-y-1">
                                          {bundle.description.split('\n').map((line, index) => {
                                            const trimmedLine = line.trim();
                                            if (trimmedLine === "") {
                                              return <br key={index} />;
                                            }
                                            if (trimmedLine.startsWith("⚠️")) {
                                              return (
                                                <p key={index} className="text-amber-400 font-medium">
                                                  {trimmedLine}
                                                </p>
                                              );
                                            }
                                            return <p key={index} className="text-gray-400 leading-relaxed">{trimmedLine}</p>;
                                          })}
                                        </div>
                                      )}
                                      {bundle.details && (
                                        <div className="text-xs text-gray-400/80 my-2 space-y-1">
                                          {bundle.details.split('\n').map((line, idx) => {
                                            const trimmedLine = line.trim();
                                            if (trimmedLine === "") {
                                              return <br key={idx} />;
                                            }
                                            const match = trimmedLine.match(/^(✅|✔|•|-|\*)\s*(.*)/);
                                            if (match && match[2]) {
                                              return (
                                                <div key={idx} className="flex items-start pl-2">
                                                  <Check className="mr-1.5 h-3.5 w-3.5 text-green-500 flex-shrink-0 mt-[1px]" />
                                                  <span className="leading-snug">{match[2]}</span>
                                                </div>
                                              );
                                            }
                                            return (
                                              <p key={idx} className="leading-snug ml-[calc(0.375rem+0.875rem)]">
                                                {trimmedLine}
                                              </p>
                                            );
                                          })}
                                        </div>
                                      )}
                                      <p className="text-primary font-semibold mt-3 text-lg">
                                        {formatPrice(bundle.price)}{t(currentLanguage, "eventSlugPage.tickets.currencySuffix")}
                                      </p>
                                    </div>
                                    <div className="flex-shrink-0 w-full sm:w-auto mt-3 sm:mt-0">
                                      {globallyTicketsOnSale && availabilityStatus.available ? (
                                        <Button
                                          onClick={() => handleOpenPurchaseModal({
                                            id: bundle.bundleId.current,
                                            name: bundle.name,
                                            price: bundle.price,
                                            isBundle: true,
                                            maxPerOrder: bundle.maxPerOrder || 10,
                                            stock: bundle.stock,
                                          })}
                                          className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white rounded-sm"
                                        >
                                          <Ticket className="mr-2 h-4 w-4" />
                                          {t(currentLanguage, "eventSlugPage.tickets.getETicket")}
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

            <Separator className="my-10" />

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
                  {event.lineup.map((artist) => (
                    <ArtistHoverCard key={artist._id} artist={artist} />
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
                      {event.venueDetails.split('\n').map((line, index) => {
                        const trimmedLine = line.trim();
                        if (trimmedLine === "") {
                          return <br key={index} />;
                        }
                        return <p key={index}>{trimmedLine}</p>;
                      })}
                    </div>
                  )}
                </div>
              )}

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
      {/* Modal for purchasing */}
      {selectedItem && supabase && (
        <PurchaseFormModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          item={selectedItem}
          eventDetails={{
            id: event._id,
            title: event.title,
            currentLanguage: currentLanguage,
          }}
          supabaseClient={supabase}
        />
      )}
      <Footer />
    </>
  );
}
