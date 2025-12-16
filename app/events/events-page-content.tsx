"use client";

import { useTranslation } from "@/lib/contexts/TranslationContext";
import ParallaxGallery from "@/components/event/parallax";
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

interface EventsPageContentProps {
    events: EventImageData[];
}

export default function EventsPageContent({ events }: EventsPageContentProps) {
    const { currentLanguage } = useTranslation();

    if (!events || events.length === 0) {
        return (
            <div className="flex flex-col min-h-screen">
                <Header />
                <main className="container mx-auto py-20 px-4 grow">
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
            <main className="grow">
                <ParallaxGallery events={events} />
            </main>
        </div>
    );
}
