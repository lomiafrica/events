"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { format } from "date-fns";

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
  categories?: {
    title: string;
  }[];
}

interface AllStoriesProps {
  stories: Story[];
  heading?: string;
}

const AllStories = ({ stories, heading = "All Stories" }: AllStoriesProps) => {
  if (!stories || stories.length === 0) {
    return (
      <section className="py-16 md:py-20">
        <div className="flex items-center justify-center mb-6">
          <div className="w-8 h-0.5 bg-primary mr-4"></div>
          <h2 className="text-primary text-lg font-medium tracking-wide">
            {heading.toUpperCase()}
          </h2>
        </div>
        <p className="text-muted-foreground text-center">
          No stories available yet.
        </p>
      </section>
    );
  }

  return (
    <section className="py-16 md:py-20 mb-20">
      {/* Header with accent line */}
      <div className="flex items-center mb-12">
        <div className="w-8 h-0.5 bg-primary mr-4"></div>
        <h2 className="text-primary text-lg font-medium tracking-wide">
          {heading.toUpperCase()}
        </h2>
      </div>

      {/* Stories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        {stories.map((story) => (
          <Link key={story._id} href={`/stories/${story.slug}`}>
            <article className="group cursor-pointer bg-white dark:bg-[#1a1a1a] rounded-sm overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 border border-zinc-200 dark:border-zinc-800 h-full">
              <div className="relative aspect-[3/2] overflow-hidden">
                <Image
                  src={story.mainImage?.url || "/placeholder.webp"}
                  alt={story.mainImage?.alt || story.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                  quality={90}
                />
              </div>
              <div className="p-5 flex flex-col flex-grow">
                <div className="flex-grow flex flex-col">
                  <div className="flex items-center mb-1">
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {format(new Date(story.publishedAt), "MMM d, yyyy")}
                    </p>
                  </div>

                  <h3 className="font-semibold text-lg mb-3 leading-tight text-zinc-900 dark:text-white group-hover:text-primary transition-colors min-h-fit">
                    {story.title}
                  </h3>
                  <p className="text-zinc-600 dark:text-zinc-400 text-sm mb-4 overflow-hidden line-clamp-2">
                    {story.excerpt}
                  </p>
                </div>
                <div className="mt-auto flex flex-row justify-between items-center">
                  {story.categories?.[0] && (
                    <span className="px-2 py-1 text-xs font-normal rounded bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
                      {story.categories[0].title}
                    </span>
                  )}

                  <div className="flex items-center text-primary text-sm font-normal">
                    Read more →
                  </div>
                </div>
              </div>
            </article>
          </Link>
        ))}
      </div>
    </section>
  );
};

export default AllStories;
