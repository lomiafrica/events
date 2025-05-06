import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { CalendarDays, Tag as TagIcon } from "lucide-react";

import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getAllBlogPosts } from "@/lib/sanity/queries";
import Header from "@/components/landing/header";
import Footer from "@/components/landing/footer";

// TODO: Replace placeholder with your actual Sanity client image URL builder
// import { urlFor } from "@/lib/sanity/client"; 
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const urlFor = (source: any) => ({ image: () => ({ url: () => source?.asset?._ref || 'https://via.placeholder.com/600x400.png?text=Card+Image' }), width: () => urlFor(source), height: () => urlFor(source), fit: () => urlFor(source), quality: () => urlFor(source) });

// Interface for blog post card data, based on postType.ts
interface SanityImageRefLite {
  _type: 'image';
  asset: { _ref: string; _type: 'reference'; };
  alt?: string;
}

interface BlogPostCard {
  _id: string;
  title: string;
  slug: { current: string }; // slug is an object with current property
  excerpt?: string;
  publishedAt: string;
  image?: SanityImageRefLite; // Changed from mainImage
  tags?: string[]; // Optional: if you want to display tags on the card
  // Add other fields if needed for the card, e.g., author name if query includes it
}

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Explore the latest articles, news, event recaps, and entertainment insights from the team at Djaouli Entertainment.",
};

export default async function BlogPage() {
  // Ensure getAllBlogPosts fetches `image` (not mainImage) and `tags` if used.
  const posts: BlogPostCard[] = await getAllBlogPosts();

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header /> {/* Assuming Header is styled and appropriate */}
      <main className="flex-grow py-12 md:py-16 lg:py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">

          {posts && posts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 xl:gap-10">
              {posts.map((post) => (
                <Card key={post._id} className="overflow-hidden flex flex-col h-full bg-card text-card-foreground shadow-lg hover:shadow-xl transition-shadow duration-300 rounded-lg border border-border">
                  {post.image && (
                    <Link href={`/blog/${post.slug.current}`} aria-label={`Read more about ${post.title}`} className="block group">
                      <div className="relative h-52 sm:h-60 w-full overflow-hidden">
                        <Image
                          src={urlFor(post.image).image().url()} // Placeholder in use
                          alt={post.image.alt || post.title}
                          fill
                          className="object-cover transition-transform duration-500 ease-in-out group-hover:scale-105"
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        />
                      </div>
                    </Link>
                  )}
                  <CardHeader className="p-5 sm:p-6">
                    <div className="text-xs text-muted-foreground mb-2 flex items-center">
                      <CalendarDays className="h-3.5 w-3.5 mr-1.5" />
                      <time dateTime={post.publishedAt}>
                        {new Date(post.publishedAt).toLocaleDateString("en-US", { year: 'numeric', month: 'long', day: 'numeric' })}
                      </time>
                    </div>
                    <CardTitle className="text-xl lg:text-2xl font-bold leading-tight hover:text-primary transition-colors">
                      <Link href={`/blog/${post.slug.current}`}>{post.title}</Link>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-5 sm:p-6 flex-grow">
                    {post.excerpt && (
                      <CardDescription className="text-muted-foreground line-clamp-3 text-sm sm:text-base">
                        {post.excerpt}
                      </CardDescription>
                    )}
                  </CardContent>
                  <CardFooter className="p-5 sm:p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-t border-border">
                    {post.tags && post.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 items-center">
                        <TagIcon className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                        {post.tags.slice(0, 3).map((tag) => (
                          <span key={tag} className="px-2.5 py-0.5 text-xs bg-secondary text-secondary-foreground rounded-full font-medium">
                            {tag.trim()}
                          </span>
                        ))}
                      </div>
                    )}
                    <Button variant="outline" asChild className="mt-auto sm:mt-0 w-full sm:w-auto hover:bg-primary hover:text-primary-foreground transition-colors duration-200 border-primary/50 text-primary">
                      <Link href={`/blog/${post.slug.current}`}>Read More &rarr;</Link>
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <h2 className="text-2xl font-semibold text-muted-foreground">No articles yet</h2>
              <p className="mt-3 text-muted-foreground">Check back soon for our latest articles!</p>
            </div>
          )}
        </div>
      </main>
      <Footer /> {/* Assuming Footer is styled and appropriate */}
    </div>
  );
}
