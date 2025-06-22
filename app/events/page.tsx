import type { Metadata } from "next";
import ImageScroller from "@/components/ui/ImageScroller";
import { getEventsForScroller } from "@/lib/sanity/queries";
import Header from "@/components/landing/header";
import Footer from "@/components/landing/footer";
import { t } from "@/lib/i18n/translations";

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
  const params = await paramsPromise;
  const currentLanguage = getPageLocale(params);
  const events: EventImageData[] = await getEventsForScroller(10);

  if (!events || events.length === 0) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="container mx-auto py-20 px-4 flex-grow">
          <h1 className="text-4xl font-bold mb-8">
            {t(currentLanguage, "eventsPage.title")}
          </h1>
          <p>{t(currentLanguage, "eventsPage.noEvents")}</p>
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
