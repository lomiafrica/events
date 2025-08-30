"use client";

import { useRef, useMemo, useState, useEffect } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRouter } from "next/navigation";
import Image from "next/image";

interface EventParallaxData {
  _id: string;
  title: string;
  slug: string;
  featuredImage?: string;
  promoVideoUrl?: string;
  number?: string;
  date?: string;
  description?: string;
  ticketsAvailable?: boolean;
}

interface ParallaxGalleryProps {
  events: EventParallaxData[];
}

export default function ParallaxGallery({ events }: ParallaxGalleryProps) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  const progressWidth = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);

  // Memoize displayEvents to prevent unnecessary re-renders
  const displayEvents = useMemo(() => {
    return events || [];
  }, [events]);

  const handleImageClick = (slug: string) => {
    router.push(`/events/${slug}`);
  };

  // State to track current active event index
  const [currentEventIndex, setCurrentEventIndex] = useState(0);

  // Update current event index based on scroll progress
  useEffect(() => {
    const unsubscribe = scrollYProgress.onChange((progress) => {
      const index = Math.round(progress * (displayEvents.length - 1));
      setCurrentEventIndex(
        Math.max(0, Math.min(index, displayEvents.length - 1)),
      );
    });
    return unsubscribe;
  }, [scrollYProgress, displayEvents.length]);

  const getCurrentDisplayNumber = () => {
    if (displayEvents.length === 0) return "#001";
    const event = displayEvents[currentEventIndex] || displayEvents[0];
    if (event.number) {
      return `#${event.number.padStart(3, "0")}`;
    }
    return `#${String(displayEvents.length - currentEventIndex).padStart(3, "0")}`;
  };

  if (displayEvents.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen text-white">
        No events available
      </div>
    );
  }

  return (
    <>
      <div
        ref={containerRef}
        className="relative z-10"
        style={{
          minHeight: `${displayEvents.length * 100}vh`,
        }}
      >
        {displayEvents.map((event) => {
          return (
            <section
              key={event._id}
              className="h-screen snap-start flex justify-center items-center relative"
            >
              <div
                className="w-[400px] h-[533px] md:w-[400px] md:h-[533px] lg:w-[500px] lg:h-[600px] m-5 mt-16 bg-black overflow-hidden relative rounded-sm shadow-2xl transition-transform duration-300 hover:scale-[1.02] cursor-pointer"
                onClick={() => handleImageClick(event.slug)}
              >
                <div className="relative w-full h-full overflow-hidden rounded">
                  <Image
                    src={event.featuredImage || "/placeholder.webp"}
                    alt={event.title}
                    priority
                    fill
                    className="object-center"
                  />
                </div>
              </div>
            </section>
          );
        })}

        {/* Single animated number positioned on the right side */}
        <motion.div
          className="fixed top-1/2 right-4 md:right-16 md:top-1/2 md:-translate-x-20 -translate-x-16 transform -translate-y-1/2 pointer-events-none z-30"
          style={{
            fontSize: "clamp(2.5rem, 12vw, 4.5rem)",
            fontFamily: '"Inter", "Helvetica Neue", Arial, sans-serif',
            letterSpacing: "-4px",
            lineHeight: "0.8",
            fontWeight: "900", // Make it bold
            fontStyle: "italic", // Make it italic
            color: "#ef4444", // Red color like the progress bar
            textShadow: `
              0 0 8px rgba(239, 68, 68, 0.4),
              0 0 16px rgba(239, 68, 68, 0.2),
              2px 2px 4px rgba(0, 0, 0, 0.8)
            `,
          }}
        >
          <motion.span
            key={currentEventIndex}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {getCurrentDisplayNumber()}
          </motion.span>
        </motion.div>

        <motion.div
          className="fixed left-0 bottom-0 h-1 bg-red-500 z-[1000] origin-left"
          style={{ width: progressWidth }}
        />
      </div>

      <style jsx global>{`
        html {
          scroll-snap-type: y mandatory;
        }

        /* Hide scrollbar while keeping scroll functionality */
        html {
          scrollbar-width: none; /* Firefox */
          -ms-overflow-style: none; /* IE and Edge */
        }

        html::-webkit-scrollbar {
          display: none; /* Chrome, Safari and Opera */
        }

        body {
          scrollbar-width: none; /* Firefox */
          -ms-overflow-style: none; /* IE and Edge */
        }

        body::-webkit-scrollbar {
          display: none; /* Chrome, Safari and Opera */
        }
      `}</style>
    </>
  );
}
