"use client";

import Link from "next/link";
import Image from "next/image";
import { CalendarDays, Clock, MapPin } from "lucide-react";
import { motion } from "framer-motion";

import { Button } from "../ui/button";
import { Badge } from "../ui/badge";

type EventProps = {
  _id: string;
  title: string;
  slug: string;
  date: string;
  time: string;
  location: string;
  flyer: {
    url: string;
  };
  ticketsAvailable: boolean;
};

export default function EventCard({ event }: { event: EventProps }) {
  return (
    <motion.div
      className="group relative rounded-sm overflow-hidden shadow-md h-[400px]"
      whileHover={{ y: -5 }}
    >
      <Link href={`/events/${event.slug}`} className="absolute inset-0 z-10">
        <span className="sr-only">View event details for {event.title}</span>
      </Link>

      <div className="relative h-full w-full">
        <Image
          src={event.flyer?.url || "/placeholder.webp?height=600&width=400"}
          alt={event.title}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

        {!event.ticketsAvailable && (
          <Badge className="absolute top-4 right-4 bg-red-500 hover:bg-red-600">
            Sold Out
          </Badge>
        )}

        <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
          <h3 className="text-xl font-bold mb-2">{event.title}</h3>

          <div className="flex flex-col gap-1 mb-4">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              <span className="text-sm">{event.date}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span className="text-sm">{event.time}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <span className="text-sm">{event.location}</span>
            </div>
          </div>

          <Button
            size="sm"
            className="w-full opacity-0 transform translate-y-4 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0"
            disabled={!event.ticketsAvailable}
          >
            {event.ticketsAvailable ? "Get Tickets" : "Sold Out"}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
