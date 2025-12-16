"use client";

import Image from "next/image";
import { CalendarDays, Clock, MapPin, Users, Check } from "lucide-react";
import Header from "@/components/landing/header";
import Footer from "@/components/landing/footer";
import { Separator } from "@/components/ui/separator";
import { EventShareButton } from "@/components/event/event-share-button";
import { YangoButton } from "@/components/event/YangoButton";
import { Card, CardContent } from "@/components/ui/card";
import { t } from "@/lib/i18n/translations";
import CheckoutButton from "@/components/event/CheckoutButton";
import ArtistCard from "@/components/event/ArtistCard";
import { useTranslation } from "@/lib/contexts/TranslationContext";

interface EventImageData {
    _id: string;
    title: string;
    slug: string;
    featuredImage: string;
    date?: string;
    description?: string;
    ticketsAvailable?: boolean;
}

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
    paymentLink?: string;
    active: boolean;
    productId?: string;
}

interface BundleData {
    _key: string;
    name: string;
    bundleId: { current: string };
    price: number;
    description?: string;
    details?: string;
    stock?: number | null;
    paymentLink?: string;
    active: boolean;
    salesStart?: string | null;
    salesEnd?: string | null;
    maxPerOrder?: number;
    productId?: string;
    ticketsIncluded?: number;
}

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

interface EventPageContentProps {
    event: EventData;
}

const formatPrice = (price: number): string => {
    return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, "\u00A0");
};

const renderFormattedText = (text: string) => {
    return text.split("\n").map((line, index, array) => {
        const trimmedLine = line.trim();

        // Handle empty lines with better spacing
        if (trimmedLine === "") {
            const nextLine = array[index + 1];
            if (nextLine && nextLine.trim() === "") {
                return <div key={index} className="h-4" />; // Larger spacing for multiple breaks
            }
            return <div key={index} className="h-2" />; // Smaller spacing for single breaks
        }

        // Detect headings (all caps, short lines, or lines ending with :)
        const isHeading =
            trimmedLine.length < 60 &&
            (trimmedLine === trimmedLine.toUpperCase() ||
                trimmedLine.endsWith(":") ||
                trimmedLine.match(/^[A-Z][A-Z\s&-]{3,}$/));

        // Detect list items
        const isListItem =
            trimmedLine.match(/^[-•*→]\s/) || trimmedLine.match(/^\d+\.\s/);

        // Detect emphasis (special characters, quotes, warnings)
        const hasEmphasis =
            trimmedLine.includes("**") ||
            trimmedLine.includes("*") ||
            trimmedLine.startsWith('"') ||
            trimmedLine.startsWith("⚠️") ||
            trimmedLine.startsWith("✨") ||
            trimmedLine.startsWith("🎵") ||
            trimmedLine.startsWith("💫") ||
            trimmedLine.startsWith("🔥");

        // Detect important venue info
        const isImportant =
            trimmedLine.startsWith("⚠️") ||
            trimmedLine.startsWith("🅿️") ||
            trimmedLine.startsWith("♿") ||
            trimmedLine.startsWith("📍") ||
            trimmedLine.toLowerCase().includes("parking") ||
            trimmedLine.toLowerCase().includes("entrance") ||
            trimmedLine.toLowerCase().includes("access");

        if (isHeading) {
            return (
                <h4
                    key={index}
                    className="text-gray-100 font-semibold text-base mt-4 mb-2 tracking-wide"
                >
                    {trimmedLine.replace(/[:]*$/, "")}
                </h4>
            );
        }

        if (isListItem) {
            return (
                <p key={index} className="mb-1 ml-4 relative">
                    <span className="absolute -ml-4 text-primary">•</span>
                    {trimmedLine.replace(/^[-•*→]\s/, "").replace(/^\d+\.\s/, "")}
                </p>
            );
        }

        if (isImportant) {
            return (
                <p key={index} className="mb-1 font-medium text-orange-300">
                    {trimmedLine}
                </p>
            );
        }

        if (hasEmphasis) {
            return (
                <p key={index} className="mb-1 font-medium text-gray-200">
                    {trimmedLine}
                </p>
            );
        }

        return (
            <p key={index} className="mb-1 text-gray-300">
                {trimmedLine}
            </p>
        );
    });
};

export default function EventPageContent({ event }: EventPageContentProps) {
    const { currentLanguage } = useTranslation();

    let mapEmbedSrc = null;
    if (event.location && (event.location.venueName || event.location.address)) {
        const queryParts = [];
        // Only add non-empty, meaningful location data
        if (
            event.location.venueName &&
            event.location.venueName.trim().length > 2
        ) {
            queryParts.push(event.location.venueName.trim());
        }
        if (event.location.address && event.location.address.trim().length > 2) {
            queryParts.push(event.location.address.trim());
        }

        const Sanequery = queryParts.join(", ");
        // Only create map embed if we have meaningful location data (more than just a few characters)
        if (Sanequery && Sanequery.length > 2) {
            const encodedQuery = encodeURIComponent(Sanequery);
            mapEmbedSrc = `https://www.google.com/maps?q=${encodedQuery}&output=embed`;
        }
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
                    <div className="lg:col-span-2 relative aspect-2/3 rounded-sm overflow-hidden shadow-lg bg-muted">
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
                                <CalendarDays className="h-6 w-6 text-primary shrink-0" />
                                <span className="text-lg text-gray-200">{formattedDate}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <Clock className="h-6 w-6 text-primary shrink-0" />
                                <span className="text-lg text-gray-200">{formattedTime}</span>
                            </div>
                            {event.location?.venueName && (
                                <div className="flex items-center gap-3">
                                    <MapPin className="h-6 w-6 text-primary shrink-0" />
                                    <div className="flex items-center justify-between flex-1 gap-2">
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
                                        </div>
                                        {event.location.yangoUrl && (
                                            <YangoButton href={event.location.yangoUrl} />
                                        )}
                                    </div>
                                </div>
                            )}
                            {event.hostedBy && (
                                <div className="flex items-center gap-3">
                                    <Users className="h-6 w-6 text-primary shrink-0" />
                                    <span className="text-lg text-gray-200">
                                        {t(currentLanguage, "eventSlugPage.hostedBy", {
                                            name: event.hostedBy,
                                        })}
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
                                        {t(
                                            currentLanguage,
                                            "eventSlugPage.tickets.salesClosedGlobal",
                                        )}
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
                                                    console.log(
                                                        "Event page - ticket.productId:",
                                                        ticket.productId,
                                                        "for ticket:",
                                                        ticket.name,
                                                    );
                                                    return (
                                                        <Card
                                                            key={ticket._key}
                                                            className="border-slate-700 bg-background shadow-lg rounded-sm overflow-hidden flex flex-col"
                                                        >
                                                            {/* Mimicking djaouli-code.tsx structure - outer div with pattern (simplified here) & inner with gradient (simplified here) */}
                                                            <div className="size-full bg-repeat p-1 bg-size-[20px_20px]">
                                                                <div className="size-full bg-linear-to-br from-background/95 via-background/85 to-background/70 rounded-sm pt-1 pb-1 px-3 flex flex-col grow">
                                                                    <CardContent className="p-0 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 grow w-full">
                                                                        <div className="grow">
                                                                            <div className="flex flex-wrap items-baseline mb-3">
                                                                                <h4 className="text-gray-100 font-bold text-lg uppercase leading-tight">
                                                                                    {ticket.name.replace(
                                                                                        /\s*\(\d+(\s*\w+)?\)$/,
                                                                                        "",
                                                                                    )}
                                                                                </h4>
                                                                                <span className="mx-2 text-gray-400 text-lg">
                                                                                    |
                                                                                </span>
                                                                                <p className="text-primary font-semibold text-xl whitespace-nowrap">
                                                                                    {formatPrice(ticket.price)}
                                                                                    {t(
                                                                                        currentLanguage,
                                                                                        "eventSlugPage.tickets.currencySuffix",
                                                                                    )}
                                                                                </p>
                                                                            </div>
                                                                            {ticket.description && (
                                                                                <div className="text-sm mb-1 space-y-1">
                                                                                    {ticket.description
                                                                                        .split("\n")
                                                                                        .map((line, index) => {
                                                                                            const trimmedLine = line.trim();
                                                                                            if (trimmedLine === "") {
                                                                                                return <br key={index} />;
                                                                                            }
                                                                                            if (
                                                                                                trimmedLine.startsWith("⚠️")
                                                                                            ) {
                                                                                                return (
                                                                                                    <p
                                                                                                        key={index}
                                                                                                        className="text-amber-400 font-medium"
                                                                                                    >
                                                                                                        {trimmedLine}
                                                                                                    </p>
                                                                                                );
                                                                                            }
                                                                                            return (
                                                                                                <p
                                                                                                    key={index}
                                                                                                    className="text-gray-400 leading-relaxed"
                                                                                                >
                                                                                                    {trimmedLine}
                                                                                                </p>
                                                                                            );
                                                                                        })}
                                                                                </div>
                                                                            )}
                                                                            {ticket.details && (
                                                                                <div className="text-xs text-gray-400/80 my-2 space-y-1">
                                                                                    {ticket.details
                                                                                        .split("\n")
                                                                                        .map((line, idx) => {
                                                                                            const trimmedLine = line.trim();
                                                                                            if (trimmedLine === "") {
                                                                                                return <br key={idx} />;
                                                                                            }
                                                                                            const match =
                                                                                                trimmedLine.match(
                                                                                                    /^(✅|✔|•|-|\*)\s*(.*)/,
                                                                                                );
                                                                                            if (match && match[2]) {
                                                                                                return (
                                                                                                    <div
                                                                                                        key={idx}
                                                                                                        className="flex items-start pl-5"
                                                                                                    >
                                                                                                        <Check className="mr-1.5 h-3.5 w-3.5 text-green-500 shrink-0 mt-px" />
                                                                                                        <span className="leading-snug">
                                                                                                            {match[2]}
                                                                                                        </span>
                                                                                                    </div>
                                                                                                );
                                                                                            }
                                                                                            return (
                                                                                                <p
                                                                                                    key={idx}
                                                                                                    className="leading-snug ml-5"
                                                                                                >
                                                                                                    {" "}
                                                                                                    {/* Indent non-list items slightly if preferred or remove ml for full width */}
                                                                                                    {trimmedLine}
                                                                                                </p>
                                                                                            );
                                                                                        })}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                        <div className="shrink-0 w-full sm:w-auto mt-3 sm:mt-0 flex justify-end">
                                                                            <CheckoutButton
                                                                                item={{
                                                                                    id: ticket._key,
                                                                                    name: ticket.name,
                                                                                    price: ticket.price,
                                                                                    isBundle: false,
                                                                                    maxPerOrder: ticket.maxPerOrder,
                                                                                    stock: ticket.stock,
                                                                                    paymentLink: ticket.paymentLink,
                                                                                    active: ticket.active,
                                                                                    salesStart: ticket.salesStart,
                                                                                    salesEnd: ticket.salesEnd,
                                                                                    productId: ticket.productId,
                                                                                }}
                                                                                eventDetails={{
                                                                                    id: event._id,
                                                                                    title: event.title,
                                                                                    dateText: formattedDate,
                                                                                    timeText: formattedTime,
                                                                                    venueName: event.location?.venueName,
                                                                                }}
                                                                                globallyTicketsOnSale={
                                                                                    globallyTicketsOnSale
                                                                                }
                                                                                currentLanguage={currentLanguage}
                                                                            />
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
                                                <h3 className="font-medium text-lg">
                                                    {t(currentLanguage, "eventSlugPage.bundles.title")}
                                                </h3>
                                                {event.bundles?.map((bundle) => {
                                                    console.log(
                                                        "Event page - bundle.productId:",
                                                        bundle.productId,
                                                        "for bundle:",
                                                        bundle.name,
                                                    );
                                                    return (
                                                        <Card
                                                            key={bundle.bundleId.current}
                                                            className="border-slate-700 bg-background shadow-lg rounded-sm overflow-hidden flex flex-col"
                                                        >
                                                            <div className="size-full bg-repeat p-1 bg-size-[20px_20px]">
                                                                <div className="size-full bg-linear-to-br from-background/95 via-background/85 to-background/70 rounded-sm pt-1 pb-1 px-3 flex flex-col grow">
                                                                    <CardContent className="p-0 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 grow w-full">
                                                                        <div className="grow">
                                                                            <div className="flex flex-wrap items-baseline mb-3">
                                                                                <h4 className="text-gray-100 font-bold text-lg uppercase leading-tight">
                                                                                    {bundle.name.replace(
                                                                                        /\s*\(\d+(\s*\w+)?\)$/,
                                                                                        "",
                                                                                    )}
                                                                                </h4>
                                                                                <span className="mx-2 text-gray-400 text-lg">
                                                                                    |
                                                                                </span>
                                                                                <p className="text-primary font-semibold text-xl whitespace-nowrap">
                                                                                    {formatPrice(bundle.price)}
                                                                                    {t(
                                                                                        currentLanguage,
                                                                                        "eventSlugPage.tickets.currencySuffix",
                                                                                    )}
                                                                                </p>
                                                                            </div>
                                                                            {bundle.description && (
                                                                                <div className="text-sm mb-1 space-y-1">
                                                                                    {bundle.description
                                                                                        .split("\n")
                                                                                        .map((line, index) => {
                                                                                            const trimmedLine = line.trim();
                                                                                            if (trimmedLine === "") {
                                                                                                return <br key={index} />;
                                                                                            }
                                                                                            if (
                                                                                                trimmedLine.startsWith("⚠️")
                                                                                            ) {
                                                                                                return (
                                                                                                    <p
                                                                                                        key={index}
                                                                                                        className="text-amber-400 font-medium"
                                                                                                    >
                                                                                                        {trimmedLine}
                                                                                                    </p>
                                                                                                );
                                                                                            }
                                                                                            return (
                                                                                                <p
                                                                                                    key={index}
                                                                                                    className="text-gray-400 leading-relaxed"
                                                                                                >
                                                                                                    {trimmedLine}
                                                                                                </p>
                                                                                            );
                                                                                        })}
                                                                                </div>
                                                                            )}
                                                                            {bundle.details && (
                                                                                <div className="text-xs text-gray-400/80 my-2 space-y-1">
                                                                                    {bundle.details
                                                                                        .split("\n")
                                                                                        .map((line, idx) => {
                                                                                            const trimmedLine = line.trim();
                                                                                            if (trimmedLine === "") {
                                                                                                return <br key={idx} />;
                                                                                            }
                                                                                            const match =
                                                                                                trimmedLine.match(
                                                                                                    /^(✅|✔|•|-|\*)\s*(.*)/,
                                                                                                );
                                                                                            if (match && match[2]) {
                                                                                                return (
                                                                                                    <div
                                                                                                        key={idx}
                                                                                                        className="flex items-start pl-5"
                                                                                                    >
                                                                                                        <Check className="mr-1.5 h-3.5 w-3.5 text-green-500 shrink-0 mt-px" />
                                                                                                        <span className="leading-snug">
                                                                                                            {match[2]}
                                                                                                        </span>
                                                                                                    </div>
                                                                                                );
                                                                                            }
                                                                                            return (
                                                                                                <p
                                                                                                    key={idx}
                                                                                                    className="leading-snug ml-5"
                                                                                                >
                                                                                                    {" "}
                                                                                                    {/* Indent non-list items slightly */}
                                                                                                    {trimmedLine}
                                                                                                </p>
                                                                                            );
                                                                                        })}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                        <div className="shrink-0 w-full sm:w-auto mt-3 sm:mt-0 flex justify-end">
                                                                            <CheckoutButton
                                                                                item={{
                                                                                    id: bundle.bundleId.current, // Use bundleId.current for bundles
                                                                                    name: bundle.name,
                                                                                    price: bundle.price,
                                                                                    isBundle: true,
                                                                                    maxPerOrder: bundle.maxPerOrder,
                                                                                    stock: bundle.stock,
                                                                                    paymentLink: bundle.paymentLink,
                                                                                    active: bundle.active,
                                                                                    salesStart: bundle.salesStart,
                                                                                    salesEnd: bundle.salesEnd,
                                                                                    productId: bundle.productId,
                                                                                    ticketsIncluded:
                                                                                        bundle.ticketsIncluded,
                                                                                }}
                                                                                eventDetails={{
                                                                                    id: event._id,
                                                                                    title: event.title,
                                                                                    dateText: formattedDate,
                                                                                    timeText: formattedTime,
                                                                                    venueName: event.location?.venueName,
                                                                                }}
                                                                                globallyTicketsOnSale={
                                                                                    globallyTicketsOnSale
                                                                                }
                                                                                currentLanguage={currentLanguage}
                                                                            />
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

                        {/* Event Details, Venue, Lineup, Gallery - No longer in Tabs, shown sequentially or based on data presence */}
                        {event.description && (
                            <div className="mb-10 pt-6">
                                <h2 className="text-2xl font-bold text-gray-100 mb-4 tracking-tight">
                                    {t(currentLanguage, "eventSlugPage.detailsSection.title")}
                                </h2>
                                <div className="prose prose-sm sm:prose dark:prose-invert max-w-none text-gray-300 leading-relaxed mt-1">
                                    {renderFormattedText(event.description)}
                                </div>
                            </div>
                        )}

                        {event.lineup && event.lineup.length > 0 && (
                            <div className="mb-10 pt-6">
                                <h2 className="text-2xl font-bold text-gray-100 mb-4 tracking-tight">
                                    {t(currentLanguage, "eventSlugPage.lineupSection.title")}
                                </h2>
                                <div className="relative">
                                    <div className="flex overflow-x-auto space-x-4 pb-4 scrollbar-none">
                                        {event.lineup.map((artist) => (
                                            <div key={artist._id} className="shrink-0">
                                                <ArtistCard
                                                    artist={artist}
                                                    currentLanguage={currentLanguage}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                    {/* Optional: Add custom scroll indicators or buttons here if needed */}
                                </div>
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
                                    {/* Embedded Map ADDED HERE */}
                                    {mapEmbedSrc && (
                                        <div className="my-6 relative w-full h-[300px] bg-muted rounded-sm shadow-lg border border-slate-700 overflow-hidden">
                                            <iframe
                                                src={mapEmbedSrc}
                                                width="100%"
                                                height="100%"
                                                style={{ border: 0 }}
                                                allowFullScreen={false}
                                                loading="lazy"
                                                referrerPolicy="no-referrer-when-downgrade"
                                                title={(() => {
                                                    const locationNameForMap =
                                                        event.location?.venueName || event.location?.address;
                                                    return locationNameForMap
                                                        ? t(
                                                            currentLanguage,
                                                            "eventSlugPage.venueSection.mapTitleNamed",
                                                            { locationName: locationNameForMap },
                                                        )
                                                        : t(
                                                            currentLanguage,
                                                            "eventSlugPage.venueSection.mapTitleDefault",
                                                        );
                                                })()}
                                                className="absolute top-0 left-0 w-full h-full"
                                            ></iframe>
                                        </div>
                                    )}
                                    {event.venueDetails && (
                                        <div className="prose prose-sm sm:prose dark:prose-invert max-w-none text-gray-300 leading-relaxed mt-1">
                                            {renderFormattedText(event.venueDetails)}
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
