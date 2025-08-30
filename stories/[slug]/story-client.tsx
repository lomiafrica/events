"use client";

import Image from "next/image";
import { PortableText } from "@portabletext/react";
import {
  Calendar,
  User,
  Facebook,
  Twitter,
  Share2,
  ArrowLeft,
} from "lucide-react";
import Tag from "@/components/blog/tag";
import { motion } from "framer-motion";
import MiniAudioPlayer from "@/components/landing/mini-audio-player";

interface PortableTextBlock {
  _type: string;
  _key: string;
  children: Array<{
    _type: string;
    _key: string;
    text: string;
    marks?: string[];
  }>;
}

interface MockStory {
  _id: string;
  title: string;
  slug: string;
  excerpt: string;
  publishedAt: string;
  author?: {
    name: string;
  };
  mainImage?: {
    url: string;
    alt?: string;
    caption?: string;
  };
  categories?: {
    title: string;
  }[];
  body?: PortableTextBlock[];
}

interface StoryClientProps {
  post: MockStory;
  slug: string;
}

export default function StoryClient({ post, slug }: StoryClientProps) {
  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/stories/${slug}`
      : `/stories/${slug}`;

  const handleShare = async (platform?: string) => {
    if (platform === "facebook") {
      window.open(
        `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
        "_blank",
      );
    } else if (platform === "twitter") {
      window.open(
        `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(post.title)}`,
        "_blank",
      );
    } else {
      // Generic share or copy to clipboard
      if (navigator.share) {
        try {
          await navigator.share({
            title: post.title,
            url: shareUrl,
          });
        } catch {
          navigator.clipboard.writeText(shareUrl);
        }
      } else {
        navigator.clipboard.writeText(shareUrl);
      }
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Mini Audio Player */}
      <div className="fixed top-[13px] md:top-4 left-4 z-[60] pointer-events-auto">
        <MiniAudioPlayer />
      </div>

      <div className="container mx-auto px-4 py-0 max-w-7xl">
        <div className="mb-8 pt-24 md:pt-32">
          <div className="flex flex-col md:flex-row md:items-start mb-6">
            <div className="md:w-[175px] shrink-0 mb-6 md:mb-0 flex flex-col items-start gap-4">
              <button
                onClick={() => window.history.back()}
                className="text-zinc-600 dark:text-zinc-400 hover:text-primary dark:hover:text-primary transition-colors inline-flex items-center"
              >
                <span className="flex items-center transition-transform duration-300">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Stories
                </span>
              </button>

              <div className="hidden md:flex items-center gap-2">
                <button
                  onClick={() => handleShare("facebook")}
                  className="text-zinc-600 dark:text-zinc-400 inline-flex items-center justify-center h-7 w-7 p-1.5 rounded-sm border border-transparent transition-colors duration-150 hover:bg-blue-400/10 dark:hover:bg-blue-400/20 hover:text-inherit hover:border-blue-500/20 dark:hover:border-blue-400/30"
                  aria-label="Share on Facebook"
                >
                  <Facebook className="h-4 w-4" />
                </button>

                <button
                  onClick={() => handleShare("twitter")}
                  className="text-zinc-600 dark:text-zinc-400 inline-flex items-center justify-center h-7 w-7 p-1.5 rounded-sm border border-transparent transition-colors duration-150 hover:bg-blue-400/10 dark:hover:bg-blue-400/20 hover:text-inherit hover:border-blue-500/20 dark:hover:border-blue-400/30"
                  aria-label="Share on Twitter"
                >
                  <Twitter className="h-4 w-4" />
                </button>

                <button
                  onClick={() => handleShare()}
                  className="text-zinc-600 dark:text-zinc-400 inline-flex items-center justify-center h-7 w-7 p-1.5 rounded-sm border border-transparent transition-colors duration-150 hover:bg-blue-400/10 dark:hover:bg-blue-400/20 hover:text-inherit hover:border-blue-500/20 dark:hover:border-blue-400/30"
                  aria-label="Share story"
                >
                  <Share2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 max-w-2xl md:max-w-4xl">
              <h1 className="text-3xl md:text-4xl font-semibold text-zinc-900 dark:text-white leading-tight mb-4">
                {post.title}
              </h1>
              {post.excerpt && (
                <p className="text-lg text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  {post.excerpt}
                </p>
              )}
            </div>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <article className="max-w-3xl sm:max-w-4xl mx-auto pb-10">
            <header className="mb-6">
              <div className="flex flex-wrap items-center text-sm text-zinc-600 dark:text-zinc-400 mb-6">
                {post.author && (
                  <div className="flex items-center mr-6 mb-2">
                    <User className="h-4 w-4 mr-2" />
                    <span>By {post.author.name}</span>
                  </div>
                )}

                <div className="mb-2 flex items-center flex-wrap">
                  <Calendar className="h-4 w-4 mr-2" />
                  <span>
                    {new Date(post.publishedAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </span>

                  {post.categories && post.categories.length > 0 && (
                    <>
                      <span className="mx-2">·</span>
                      {post.categories.map(
                        (category: { title: string }, index: number) => (
                          <Tag
                            key={index}
                            text={category.title}
                            variant="outline"
                            size="sm"
                            className="mr-2"
                          />
                        ),
                      )}
                    </>
                  )}
                </div>
              </div>

              {post.mainImage && (
                <div className="rounded-sm overflow-hidden mb-6 shadow-md">
                  <div className="aspect-[16/9] md:aspect-[16/9] relative">
                    <Image
                      src={post.mainImage.url}
                      alt={post.mainImage.alt || post.title}
                      fill
                      priority
                      className="object-cover"
                    />
                  </div>
                  {post.mainImage.caption && (
                    <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 italic px-2 md:text-right text-right">
                      {post.mainImage.caption}
                    </div>
                  )}
                </div>
              )}
            </header>

            <div className="prose prose-zinc dark:prose-invert prose-headings:font-semibold prose-h1:text-3xl prose-h1:font-semibold prose-h1:mb-6 prose-h2:text-2xl prose-h2:font-semibold prose-h2:mt-8 prose-h2:mb-4 prose-h3:text-xl prose-h3:font-normal prose-h3:mt-6 prose-h3:mb-3 prose-h4:text-lg prose-h4:font-normal prose-h4:mt-4 prose-h4:mb-2 prose-p:text-base prose-p:leading-relaxed prose-p:my-4 prose-ul:my-4 prose-ul:list-disc prose-ul:pl-5 prose-ol:my-4 prose-ol:list-decimal prose-ol:pl-5 prose-li:my-2 prose-li:pl-1 prose-blockquote:border-l-4 prose-blockquote:border-primary/30 prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-zinc-600 dark:prose-blockquote:text-zinc-300 prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-img:rounded-sm prose-img:shadow-md prose-img:max-w-full prose-img:mx-auto prose-strong:font-semibold prose-strong:text-zinc-900 dark:prose-strong:text-white prose-em:italic prose-code:bg-zinc-100 prose-code:text-zinc-800 dark:prose-code:bg-zinc-800 dark:prose-code:text-zinc-200 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-pre:bg-zinc-100 dark:prose-pre:bg-zinc-800 prose-pre:p-4 prose-pre:rounded-sm prose-pre:overflow-x-auto max-w-none mx-auto px-0">
              {post.body ? (
                <PortableText value={post.body} />
              ) : (
                <div className="space-y-6">
                  <p className="text-zinc-800 dark:text-zinc-300 leading-relaxed text-lg">
                    {post.excerpt}
                  </p>
                  <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed">
                    This is placeholder content for the story. In a real
                    implementation, this would be rich text content from your
                    CMS.
                  </p>
                  <div className="my-8">
                    <div className="aspect-video bg-zinc-100 dark:bg-zinc-800 rounded-sm flex items-center justify-center">
                      <p className="text-zinc-500 dark:text-zinc-400">
                        Story image placeholder
                      </p>
                    </div>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2">
                      Image caption would appear here in a real implementation.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </article>
        </motion.div>

        {/* Related Stories Section */}
        <div className="max-w-3xl sm:max-w-4xl mx-auto mt-16 mb-20">
          <div className="flex items-center mb-8">
            <div className="w-8 h-0.5 bg-primary mr-4"></div>
            <h3 className="text-primary text-lg font-medium tracking-wide">
              RELATED STORIES
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <article className="group cursor-pointer bg-white dark:bg-[#1a1a1a] rounded-sm overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 border border-zinc-200 dark:border-zinc-800">
              <div className="aspect-[16/9] bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                <p className="text-zinc-400 dark:text-zinc-600 text-sm">
                  Story Image
                </p>
              </div>
              <div className="p-5">
                <h4 className="font-normal text-lg mb-3 leading-tight text-zinc-900 dark:text-white group-hover:text-primary transition-colors">
                  The Birth of Kamayakoi: A Journey Through Sound
                </h4>
                <p className="text-zinc-600 dark:text-zinc-400 text-sm mb-4 line-clamp-2">
                  Discover the origins and evolution of Kamayakoi through the
                  stories of its founders and early community.
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    2 hours ago
                  </span>
                  <Tag text="Featured" variant="outline" size="sm" />
                </div>
              </div>
            </article>

            <article className="group cursor-pointer bg-white dark:bg-[#1a1a1a] rounded-sm overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 border border-zinc-200 dark:border-zinc-800">
              <div className="aspect-[16/9] bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                <p className="text-zinc-400 dark:text-zinc-600 text-sm">
                  Story Image
                </p>
              </div>
              <div className="p-5">
                <h4 className="font-normal text-lg mb-3 leading-tight text-zinc-900 dark:text-white group-hover:text-primary transition-colors">
                  Behind the Decks: Meet Our Resident DJs
                </h4>
                <p className="text-zinc-600 dark:text-zinc-400 text-sm mb-4 line-clamp-2">
                  Get to know the talented artists who bring Kamayakoi&apos;s
                  sound to life every night.
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    5 hours ago
                  </span>
                  <Tag text="Artists" variant="outline" size="sm" />
                </div>
              </div>
            </article>

            <article className="group cursor-pointer bg-white dark:bg-[#1a1a1a] rounded-sm overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 border border-zinc-200 dark:border-zinc-800">
              <div className="aspect-[16/9] bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                <p className="text-zinc-400 dark:text-zinc-600 text-sm">
                  Story Image
                </p>
              </div>
              <div className="p-5">
                <h4 className="font-normal text-lg mb-3 leading-tight text-zinc-900 dark:text-white group-hover:text-primary transition-colors">
                  Festival Season: Kamayakoi Takes the Stage
                </h4>
                <p className="text-zinc-600 dark:text-zinc-400 text-sm mb-4 line-clamp-2">
                  Join us as we explore the vibrant festival scene and
                  Kamayakoi&apos;s place in it.
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    1 day ago
                  </span>
                  <Tag text="Events" variant="outline" size="sm" />
                </div>
              </div>
            </article>
          </div>
        </div>
      </div>
    </div>
  );
}
