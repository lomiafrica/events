import { notFound } from "next/navigation";
import { getEventBySlug } from "@/lib/sanity/queries";
import EventPageContent from "./event-page-content";

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
  paymentLink?: string;
  active: boolean;
  productId?: string;
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
  paymentLink?: string;
  active: boolean;
  salesStart?: string | null;
  salesEnd?: string | null;
  maxPerOrder?: number;
  productId?: string;
  ticketsIncluded?: number;
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

export async function generateMetadata({
  params: paramsPromise,
}: {
  params: Promise<{ slug: string; locale?: string }>;
}) {
  const params = await paramsPromise;
  const { slug } = params;
  const event: EventData | null = await getEventBySlug(slug, "en");

  if (!event) {
    return {
      title: `Event Not Found`,
    };
  }

  return {
    title: `${event.title}`,
    description: event.subtitle || event.description,
  };
}

export default async function EventPage({
  params: paramsPromise,
}: {
  params: Promise<{ slug: string; locale?: string }>;
}) {
  const params = await paramsPromise;
  const { slug } = params;
  const event: EventData | null = await getEventBySlug(slug, "en");

  if (!event) {
    notFound();
  }

  return <EventPageContent event={event} />;
}