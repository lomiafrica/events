import Link from "next/link"
import Image from "next/image"
import { ArrowRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import EventCard from "@/components/event-card"
import FeaturedStory from "@/components/featured-story"
import { getLatestEvents, getLatestBlogPosts, getFeaturedStory } from "@/lib/sanity/queries"

// Define types for the data
interface Event {
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
}

interface Post {
  _id: string;
  title: string;
  slug: string;
  excerpt: string;
  publishedAt: string;
  mainImage?: {
    url: string;
  };
}

export default async function Home() {
  const events = await getLatestEvents(3)
  const posts = await getLatestBlogPosts(2)
  const story = await getFeaturedStory()

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative w-full h-[70vh] md:h-[80vh]">
        <Image
          src="/placeholder.svg?height=1080&width=1920"
          alt="Djaouli Events"
          fill
          priority
          className="object-cover brightness-50"
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">Unforgettable Events in Côte d&apos;Ivoire</h1>
          <p className="text-xl text-white/90 max-w-2xl mb-8">
            Experience the best events in Abidjan and beyond with Djaouli Entertainment
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Button size="lg" asChild>
              <Link href="/events">Explore Events</Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="bg-black/30 text-white border-white hover:bg-white hover:text-black"
              asChild
            >
              <Link href="/blog">Read Our Blog</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Upcoming Events Section */}
      <section className="py-16 px-4 md:px-8 max-w-7xl mx-auto w-full">
        <div className="flex justify-between items-center mb-10">
          <h2 className="text-3xl font-bold">Upcoming Events</h2>
          <Button variant="ghost" asChild>
            <Link href="/events" className="flex items-center gap-2">
              View All <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event: Event) => (
            <EventCard key={event._id} event={event} />
          ))}
        </div>
      </section>

      {/* Featured Story Section */}
      {story && (
        <section className="py-16 px-4 md:px-8 bg-muted">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-3xl font-bold mb-10">Our Story</h2>
            <FeaturedStory story={story} />
            <div className="mt-8 text-center">
              <Button asChild>
                <Link href="/story">Read Our Full Story</Link>
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* Blog Section */}
      <section className="py-16 px-4 md:px-8 max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-10">
          <h2 className="text-3xl font-bold">Latest from the Blog</h2>
          <Button variant="ghost" asChild>
            <Link href="/blog" className="flex items-center gap-2">
              View All <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {posts.map((post: Post) => (
            <Card key={post._id} className="overflow-hidden">
              <div className="relative h-60">
                <Image
                  src={post.mainImage?.url || "/placeholder.svg?height=400&width=600"}
                  alt={post.title}
                  fill
                  className="object-cover"
                />
              </div>
              <CardContent className="p-6">
                <div className="text-sm text-muted-foreground mb-2">
                  {new Date(post.publishedAt).toLocaleDateString()}
                </div>
                <h3 className="text-xl font-bold mb-2">{post.title}</h3>
                <p className="text-muted-foreground mb-4 line-clamp-2">{post.excerpt}</p>
                <Button variant="outline" asChild>
                  <Link href={`/blog/${post.slug}`}>Read More</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-16 px-4 md:px-8 bg-primary text-primary-foreground">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Experience Our Events?</h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto">
            Don&apos;t miss out on the best events in Côte d&apos;Ivoire. Browse our upcoming events and secure your tickets
            today.
          </p>
          <Button size="lg" variant="secondary" asChild>
            <Link href="/events">Explore Events</Link>
          </Button>
        </div>
      </section>
    </div>
  )
}

