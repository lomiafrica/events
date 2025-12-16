import type { Metadata } from "next";
import { getEventsForScroller } from "@/lib/sanity/queries";
import { t } from "@/lib/i18n/translations";
import EventsPageContent from "./events-page-content";

interface EventImageData {
  _id: string;
  title: string;
  slug: string;
  featuredImage: string;
  date?: string;
  description?: string;
  ticketsAvailable?: boolean;
}

const getPageLocale = (params?: { locale?: string }): string => {
  return params?.locale || process.env.NEXT_PUBLIC_DEFAULT_LOCALE || "en";
};

export async function generateMetadata({
  params: paramsPromise,
}: {
  params: Promise<{ locale?: string }>;
}): Promise<Metadata> {
  const params = await paramsPromise;
  const currentLanguage = getPageLocale(params);
  return {
    title: t(currentLanguage, "eventsPage.metadata.title"),
    description: t(currentLanguage, "eventsPage.metadata.description"),
  };
}

export default async function EventsPage({
  params: paramsPromise,
}: {
  params: Promise<{ locale?: string }>;
}) {
  const events: EventImageData[] = await getEventsForScroller();
  return <EventsPageContent events={events} />;
}
