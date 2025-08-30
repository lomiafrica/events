import type { Metadata } from "next";
import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import Header from "@/components/landing/header";
import MiniAudioPlayer from "@/components/landing/mini-audio-player";
import LoadingComponent from "@/components/ui/loader";

import AllStories from "@/components/blog/all-stories";
import { getAllBlogPosts } from "@/lib/sanity/queries";
import { getMockStories } from "@/lib/mock-stories";
import { Footer } from "@/components/landing/footer";

export const metadata: Metadata = {
  title: "Stories | Kamayakoi",
  description:
    "Discover inspiring stories, insights, and narratives from our community",
};

interface StoryCategory {
  title: string;
}

interface Story {
  _id: string;
  title: string;
  slug: string;
  excerpt?: string;
  publishedAt: string;
  author?: {
    name: string;
  };
  mainImage?: {
    url: string;
    alt?: string;
  };
  categories?: StoryCategory[];
}

async function StoriesContent() {
  let allStories: Story[] = await getAllBlogPosts();

  // If no stories from Sanity, use mock data
  if (!allStories || allStories.length === 0) {
    allStories = getMockStories() as Story[];
  }

  // Get featured stories (first 4) and all other stories
  const featuredStories = allStories.slice(0, 4);
  const remainingStories = allStories.slice(4);

  return (
    <div className="min-h-screen">
      {/* Mini Audio Player */}
      <div className="fixed top-[13px] md:top-4 left-4 z-[60] pointer-events-auto">
        <MiniAudioPlayer />
      </div>

      {/* Header */}
      <Header />

      {/* Main Content */}
      <main>
        <div className="container mx-auto px-4 py-0 max-w-7xl">
          {/* Hero Section */}
          <div className="relative pt-24 md:pt-32 -mb-12">
            <h1 className="text-4xl sm:text-5xl md:text-7xl tracking-tighter font-regular text-zinc-800 dark:text-white mb-6">
              Stories
            </h1>
            <p className="text-zinc-600 dark:text-zinc-200 text-base sm:text-lg md:text-xl leading-relaxed tracking-tight max-w-2xl mb-6">
              Discover inspiring stories, insights, and narratives from our
              community. Each story captures the essence of Kamayakoi&apos;s
              journey and the people who make it special.
            </p>
          </div>

          {/* Featured Stories */}
          {featuredStories.length > 0 && (
            <section className="py-16 md:py-20 -mb-24">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Featured Story */}
                <div className="lg:col-span-3">
                  <article className="group cursor-pointer bg-white dark:bg-[#1a1a1a] rounded-sm overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 border border-zinc-200 dark:border-zinc-800">
                    <div className="relative h-96 md:h-[36rem] overflow-hidden">
                      <Image
                        src={
                          featuredStories[0].mainImage?.url ||
                          "/placeholder.webp"
                        }
                        alt={
                          featuredStories[0].mainImage?.alt ||
                          featuredStories[0].title
                        }
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-700"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    </div>
                    <div className="p-6">
                      <div className="flex justify-between items-baseline gap-4">
                        <h3 className="text-2xl md:text-3xl font-semibold text-zinc-900 dark:text-white group-hover:text-primary transition-colors flex-1">
                          {featuredStories[0].title}
                        </h3>

                        <Link
                          href={`/stories/${featuredStories[0].slug}`}
                          className="inline-flex items-center gap-2 text-primary hover:text-primary/80 transition-colors -translate-y-1 group-hover:translate-x-1 transform duration-300 shrink-0"
                        >
                          <span>→</span>
                        </Link>
                      </div>
                    </div>
                  </article>
                </div>

                {/* Other Stories */}
                {featuredStories.slice(1, 4).map((story: Story) => (
                  <article
                    key={story._id}
                    className="group cursor-pointer bg-white dark:bg-[#1a1a1a] rounded-sm overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 border border-zinc-200 dark:border-zinc-800"
                  >
                    <div className="relative h-48 overflow-hidden">
                      <Image
                        src={story.mainImage?.url || "/placeholder.webp"}
                        alt={story.mainImage?.alt || story.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-700"
                      />
                    </div>
                    <div className="p-4">
                      <div className="flex flex-wrap gap-1 mb-2">
                        {story.categories
                          ?.slice(0, 2)
                          .map((category: StoryCategory, index: number) => (
                            <span
                              key={index}
                              className="px-2 py-1 text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded"
                            >
                              {category.title}
                            </span>
                          ))}
                      </div>

                      <h4 className="font-semibold mb-2 text-zinc-900 dark:text-white group-hover:text-primary transition-colors line-clamp-2">
                        {story.title}
                      </h4>

                      <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-3 line-clamp-2">
                        {story.excerpt}
                      </p>

                      <div className="flex items-center justify-between">
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">
                          {new Date(story.publishedAt).toLocaleDateString(
                            "en-US",
                            { month: "short", day: "numeric" },
                          )}
                        </span>
                        <Link
                          href={`/stories/${story.slug}`}
                          className="inline-flex items-center gap-1 text-primary hover:text-primary/80 transition-colors"
                        >
                          Read
                          <span>→</span>
                        </Link>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          {/* All Stories */}
          {remainingStories.length > 0 && (
            <AllStories stories={remainingStories} heading="More Stories" />
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default async function StoriesPage() {
  return (
    <Suspense fallback={<LoadingComponent />}>
      <StoriesContent />
    </Suspense>
  );
}
