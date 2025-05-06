import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PortableText, type PortableTextReactComponents } from "@portabletext/react";
import { CalendarDays, Tag as TagIcon, UserCircle2 } from "lucide-react";

import { getBlogPostBySlug } from "@/lib/sanity/queries";
import { Separator } from "@/components/ui/separator";
import { portableTextRenderers } from "@/components/blog/portable-text-renderers";

// TODO: Replace placeholder with your actual Sanity client image URL builder
// import { urlFor } from "@/lib/sanity/client"; 
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const urlFor = (source: any) => ({ image: () => ({ url: () => source?.asset?._ref || 'https://via.placeholder.com/1200x675.png?text=Post+Image' }), width: () => urlFor(source), height: () => urlFor(source), fit: () => urlFor(source), quality: () => urlFor(source) });

// Types based on your schemas (postType.ts, authorType.ts)
// TODO: Install @portabletext/types and use PortableTextBlock[] instead of any[] for body/bio
interface SanityImageRef {
  _type: 'image';
  asset: { _ref: string; _type: 'reference'; };
  alt?: string;
  caption?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  hotspot?: any; // from schema
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  crop?: any; // from schema
}

interface Author {
  _type: 'reference'; // Assuming author is a reference in post
  name: string;
  image?: SanityImageRef;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  bio?: any[]; // Portable Text
  role?: string;
  slug?: { current: string };
}

interface Post {
  _id: string;
  title: string; // English title as base
  title_fr?: string; // Example for localization, add others (es, pt, zh) if needed
  slug: { current: string };
  publishedAt: string;
  image?: SanityImageRef; // Main featured image
  excerpt?: string; // English excerpt
  excerpt_fr?: string; // Example for localization
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body: any[]; // Portable Text (English body)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body_fr?: any[]; // Example for localization
  author?: Author;
  tags?: string[]; // From postType.ts
  // languages?: string[]; // from postType.ts if you handle language switching here
  // category?: string; // Legacy category from postType.ts, if needed
}

// Helper to get localized content (simplified example)
// TODO: Implement robust i18n if required, e.g., using next-international or next-i18next
const getLocalized = (post: Post, field: keyof Post, currentLang: string = 'en') => {
  if (currentLang === 'en') return post[field];
  const localizedField = `${field}_${currentLang}` as keyof Post;
  return post[localizedField] || post[field]; // Fallback to English
};

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const slug = params.slug;
  const post: Post | null = await getBlogPostBySlug(slug);

  if (!post) {
    return { title: "Post Not Found" };
  }

  const displayTitle = getLocalized(post, 'title') as string || "Untitled Post";
  const displayExcerpt = getLocalized(post, 'excerpt') as string || "";
  const ogImageUrl = post.image ? urlFor(post.image).image().url() : "/placeholder-og.jpg"; // Ensure you have a fallback OG image

  return {
    title: `${displayTitle} | Djaouli Entertainment Blog`,
    description: displayExcerpt,
    openGraph: {
      title: displayTitle,
      description: displayExcerpt,
      images: [{ url: ogImageUrl, width: 1200, height: 630, alt: displayTitle }],
      type: 'article',
      publishedTime: post.publishedAt,
      authors: post.author ? [post.author.name] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title: displayTitle,
      description: displayExcerpt,
      images: [ogImageUrl],
    },
  };
}

export default async function BlogPostPage({ params }: { params: { slug: string } }) {
  const slug = params.slug;
  const post: Post | null = await getBlogPostBySlug(slug);

  if (!post) {
    notFound();
  }

  // For this example, we'll assume English content. 
  // TODO: Implement language selection logic if your site is multilingual, 
  // using `getLocalized` or a similar approach with `searchParams.lang` or a context/cookie.
  const title = post.title;
  const excerpt = post.excerpt;
  const body = post.body; // Assuming body is always populated, even if it's English fallback
  const authorBio = post.author?.bio;

  const publishedDate = new Date(post.publishedAt).toLocaleDateString("en-US", {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <div className="bg-background text-foreground min-h-screen">
      {/* Inspired by BlogLayout and blog-post.tsx structure */}
      <main className="relative z-10 py-12 md:py-20">
        <article className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl xl:max-w-5xl">
          {/* Header Section - Richer than original */}
          <header className="mb-10 md:mb-12 border-b border-border pb-8 md:pb-10">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-primary mb-4 md:mb-6 leading-tight">
              {title}
            </h1>
            {excerpt && (
              <p className="text-lg md:text-xl text-muted-foreground mt-2 mb-6 md:mb-8 leading-relaxed">
                {excerpt}
              </p>
            )}
            <div className="flex flex-wrap gap-x-6 gap-y-3 text-sm text-muted-foreground items-center">
              {post.author && (
                <div className="flex items-center gap-2.5">
                  {post.author.image ? (
                    <Image
                      src={urlFor(post.author.image).image().url()} // Placeholder in use
                      alt={post.author.name || 'Author image'}
                      width={36}
                      height={36}
                      className="rounded-full shadow-sm"
                    />
                  ) : (
                    <UserCircle2 className="h-9 w-9 text-muted-foreground" />
                  )}
                  <div>
                    <span className="font-semibold text-foreground">{post.author.name}</span>
                    {post.author.role && <span className="block text-xs">{post.author.role}</span>}
                  </div>
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4" />
                <time dateTime={post.publishedAt}>{publishedDate}</time>
              </div>
              {post.tags && post.tags.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <TagIcon className="h-4 w-4 flex-shrink-0" />
                  {post.tags.map((tag) => (
                    <span key={tag} className="px-3 py-1 text-xs font-medium bg-secondary text-secondary-foreground rounded-full shadow-sm">
                      {tag.trim()}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </header>

          {/* Main Featured Image - from post.image (postType.ts) */}
          {post.image && (
            <div className="my-10 md:my-12 rounded-lg overflow-hidden shadow-xl group transform transition-all duration-300 hover:shadow-2xl">
              <div className="relative aspect-[16/9]">
                <Image
                  src={urlFor(post.image).image().url()} // Placeholder in use
                  alt={post.image.alt || title}
                  fill
                  priority
                  className="object-cover transition-transform duration-500 ease-in-out group-hover:scale-105"
                  sizes="(max-width: 768px) 100vw, (max-width: 1024px) 80vw, 1024px"
                />
              </div>
              {post.image.caption && (
                <div className="py-2 px-4 bg-muted/30 backdrop-blur-sm">
                  <p className="text-xs text-muted-foreground italic text-center md:text-right">{post.image.caption}</p>
                </div>
              )}
            </div>
          )}

          {/* PortableText Content - Ensure blog.css is globally imported for full .prose styling */}
          <div className="prose prose-zinc dark:prose-invert lg:prose-lg xl:prose-xl max-w-none mx-auto 
                          prose-headings:font-bold prose-headings:tracking-tight 
                          prose-h1:text-primary prose-h2:text-primary 
                          prose-a:text-primary hover:prose-a:decoration-primary/80 
                          prose-img:rounded-lg prose-img:shadow-lg 
                          prose-blockquote:border-primary/80 prose-blockquote:bg-zinc-50 dark:prose-blockquote:bg-zinc-800/40 prose-blockquote:rounded-r-md prose-blockquote:shadow-sm 
                          prose-code:bg-zinc-100 dark:prose-code:bg-zinc-800 prose-code:text-foreground prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-sm prose-code:font-mono prose-code:text-sm 
                          prose-pre:bg-zinc-100 dark:prose-pre:bg-zinc-800 prose-pre:border prose-pre:border-zinc-200 dark:prose-pre:border-zinc-700 prose-pre:rounded-lg prose-pre:shadow-md prose-pre:text-sm">
            {body && body.length > 0 ? (
              <PortableText value={body} components={portableTextRenderers as Partial<PortableTextReactComponents>} />
            ) : (
              <p className="text-center text-muted-foreground py-10">This post does not have content yet.</p>
            )}
          </div>

          <Separator className="my-12 md:my-16" />

          {/* Author Bio Section */}
          {post.author && (
            <div className="bg-secondary/30 p-6 sm:p-8 rounded-xl shadow-lg border border-border">
              <h2 className="text-2xl md:text-3xl font-bold mb-6 text-primary">About the Author</h2>
              <div className="flex flex-col sm:flex-row items-start gap-6">
                {post.author.image ? (
                  <Image
                    src={urlFor(post.author.image).image().url()} // Placeholder in use
                    alt={post.author.name || 'Author image'}
                    width={100}
                    height={100}
                    className="rounded-lg shadow-md flex-shrink-0 object-cover"
                  />
                ) : (
                  <UserCircle2 className="h-24 w-24 text-muted-foreground flex-shrink-0" />
                )}
                <div className="flex-grow">
                  <h3 className="text-xl md:text-2xl font-semibold text-foreground mb-1">{post.author.name}</h3>
                  {post.author.role && (
                    <p className="text-base text-muted-foreground mb-3 font-medium italic">{post.author.role}</p>
                  )}
                  {authorBio && authorBio.length > 0 && (
                    <div className="text-muted-foreground prose prose-sm dark:prose-invert max-w-none prose-p:my-2 leading-relaxed">
                      <PortableText value={authorBio} components={portableTextRenderers as Partial<PortableTextReactComponents>} />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="mt-12 md:mt-16 text-center">
            <Link href="/blog" className="text-primary hover:underline font-medium">
              &larr; Back to All Articles
            </Link>
          </div>
        </article>
      </main>
    </div>
  );
}

// Optional: Generate static paths
// export async function generateStaticParams() {
//   const posts = await getAllBlogPosts();
//   return posts.map((post: any) => ({ slug: post.slug?.current || post.slug }));
// }
