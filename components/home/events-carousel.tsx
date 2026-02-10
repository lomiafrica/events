import Link from "next/link";
import Image from "next/image";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import { getEventsForScroller } from "@/lib/sanity/queries";
import { t } from "@/lib/i18n/translations";

export async function EventsCarousel() {
  const events = await getEventsForScroller(4);

  if (!events || events.length === 0) return null;

  return (
    <section className="py-12 md:py-16 bg-background border-t border-border/40">
      <div className="container mx-auto px-4">
        <div className="h-px w-full bg-border/40 mb-8" />
        <div className="flex items-baseline justify-between mb-6">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
            {t("en", "homePage.latestEvents")}
          </h2>
          <Link
            href="/events"
            className="text-sm font-medium text-primary hover:underline"
          >
            {t("en", "homePage.viewAll")}
          </Link>
        </div>

        <Carousel className="w-full">
          <CarouselContent>
            {events.map((event) => (
              <CarouselItem
                key={event._id}
                className="basis-full sm:basis-1/2 lg:basis-1/3 xl:basis-1/4"
              >
                <Link
                  href={`/events/${event.slug}`}
                  className="group block h-full rounded-sm border border-border/40 bg-card overflow-hidden shadow-sm hover:shadow-lg transition-shadow"
                >
                  <div className="relative aspect-[4/5] w-full overflow-hidden bg-muted">
                    {event.featuredImage ? (
                      <Image
                        src={event.featuredImage}
                        alt={event.title}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 33vw, 25vw"
                        priority={false}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                        No image
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <p className="text-xs uppercase tracking-wide text-slate-300 mb-1">
                        {event.date
                          ? new Date(event.date).toLocaleDateString("en-GB", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })
                          : ""}
                      </p>
                      <h3 className="text-sm font-semibold text-white line-clamp-2">
                        {event.title}
                      </h3>
                    </div>
                  </div>
                </Link>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
      </div>
    </section>
  );
}
