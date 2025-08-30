import Image from "next/image";
import { notFound } from "next/navigation";
import { PortableText } from "@portabletext/react";
import { CalendarDays, User, Tag } from "lucide-react";
import { getNewsPostBySlug } from "@/lib/queries/news";
import type { NewsPost } from "@/lib/types/news";

// Category type is now handled by NewsPost type

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post: NewsPost | null = await getNewsPostBySlug(slug);

  if (!post) {
    return {
      title: "Post Not Found",
    };
  }

  return {
    title: `${post.title} | Djaouli Entertainment Blog`,
    description: post.excerpt,
  };
}

export default async function NewsPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post: NewsPost | null = await getNewsPostBySlug(slug);

  if (!post) {
    notFound();
  }

  return (
    <article className="min-h-screen bg-gradient-to-b from-background to-muted/10">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        {/* Article Header */}
        <header className="mb-12 space-y-8">
          <div className="text-center space-y-6">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-foreground leading-tight">
              {post.title}
            </h1>

            {/* Meta Information */}
            <div className="flex flex-wrap justify-center gap-6 text-muted-foreground">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5" />
                <time dateTime={post.publishedAt} className="font-medium">
                  {new Date(post.publishedAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </time>
              </div>

              {post.author && (
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  <span className="font-medium">{post.author.name}</span>
                </div>
              )}

              {post.categories && post.categories.length > 0 && (
                <div className="flex items-center gap-2">
                  <Tag className="h-5 w-5" />
                  <span className="font-medium">
                    {post.categories?.map((cat) => cat.title).join(", ") || ""}
                  </span>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Featured Image */}
        {post.mainImage && (
          <div className="relative aspect-video mb-12 rounded-2xl overflow-hidden shadow-2xl">
            <Image
              src={post.mainImage?.asset?.url || "/placeholder.webp"}
              alt={post.mainImage?.alt || post.title}
              fill
              priority
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
          </div>
        )}

        {/* Article Content */}
        <div className="bg-card/50 backdrop-blur-sm rounded-2xl p-8 md:p-12 shadow-lg border border-border/50">
          <div className="prose prose-lg md:prose-xl max-w-none prose-headings:text-foreground prose-p:text-muted-foreground prose-strong:text-foreground prose-a:text-primary hover:prose-a:text-primary/80 prose-blockquote:border-primary prose-code:text-primary">
            <PortableText value={post.body} />
          </div>
        </div>

        {/* Article Footer */}
        <footer className="mt-16 pt-8 border-t border-border/50">
          <div className="text-center">
            <p className="text-muted-foreground text-sm">
              Published on{" "}
              {new Date(post.publishedAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
        </footer>
      </div>
    </article>
  );
}
