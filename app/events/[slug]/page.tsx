import Image from "next/image"
import { notFound } from "next/navigation"
import { CalendarDays, Clock, MapPin, Share2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getEventBySlug } from "@/lib/sanity/queries"
import TicketSelector from "@/components/ticket-selector"

export async function generateMetadata({
  params
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params;
  const event = await getEventBySlug(slug)

  if (!event) {
    return {
      title: "Event Not Found",
    }
  }

  return {
    title: `${event.title} | Djaouli Entertainment`,
    description: event.description,
  }
}

export default async function EventPage({
  params
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params;
  const event = await getEventBySlug(slug)

  if (!event) {
    notFound()
  }

  return (
    <div className="container mx-auto py-12 px-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Event Flyer */}
        <div className="relative aspect-[2/3] rounded-xl overflow-hidden shadow-lg">
          <Image
            src={event.flyer?.url || "/placeholder.svg?height=900&width=600"}
            alt={event.title}
            fill
            priority
            className="object-cover"
          />
        </div>

        {/* Event Details */}
        <div>
          <h1 className="text-3xl md:text-4xl font-bold mb-4">{event.title}</h1>

          <div className="flex flex-col gap-3 mb-6">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-primary" />
              <span>{event.date}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              <span>{event.time}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              <span>{event.location}</span>
            </div>
          </div>

          <Separator className="my-6" />

          <Tabs defaultValue="tickets">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="tickets">Tickets</TabsTrigger>
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="venue">Venue</TabsTrigger>
            </TabsList>

            <TabsContent value="tickets" className="py-4">
              <h2 className="text-xl font-semibold mb-4">Select Tickets</h2>

              {event.ticketsAvailable ? (
                <TicketSelector event={event} />
              ) : (
                <div className="bg-red-50 text-red-800 p-4 rounded-md">
                  <p className="font-medium">Sorry, tickets are no longer available for this event.</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="details" className="py-4">
              <h2 className="text-xl font-semibold mb-4">Event Details</h2>
              <div className="prose max-w-none">
                <p>{event.description}</p>
              </div>
            </TabsContent>

            <TabsContent value="venue" className="py-4">
              <h2 className="text-xl font-semibold mb-4">Venue Information</h2>
              <div className="prose max-w-none">
                <p>{event.venueDetails}</p>
              </div>

              <div className="mt-6 h-[300px] bg-muted rounded-md relative">
                <Image src="/placeholder.svg?height=600&width=800" alt="Venue Map" fill className="object-cover" />
              </div>
            </TabsContent>
          </Tabs>

          <Separator className="my-6" />

          <div className="flex items-center justify-between">
            <Button variant="outline" className="flex items-center gap-2">
              <Share2 className="h-4 w-4" />
              Share Event
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

