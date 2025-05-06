import { ReactNode } from "react";
import { Helmet } from "react-helmet-async";
import { Footer } from "@/components/landing/Footer";
import GridSystem from "./grid-system";

interface BlogLayoutProps {
  children: ReactNode;
  title: string;
  description?: string;
  imageUrl?: string;
  publishedAt?: string;
  authorName?: string;
}

export function BlogLayout({
  children,
  title,
  description,
  imageUrl,
  publishedAt,
  authorName,
}: BlogLayoutProps) {
  // When imageUrl is provided, it's the article's main image from Sanity (processed through urlFor)
  // Only use fallback if no image was found in the article
  const ogImage =
    imageUrl ||
    "https://res.cloudinary.com/dzrdlevfn/image/upload/v1742742718/lomi_banner_nldw12.webp"; // Fallback OG image - update this path to a real image

  return (
    <>
      <Helmet>
        <title>{title} | lomi.</title>
        {description && <meta name="description" content={description} />}

        {/* Open Graph / Facebook */}
        <meta property="og:type" content="article" />
        <meta property="og:title" content={title} />
        {description && (
          <meta property="og:description" content={description} />
        )}
        <meta property="og:image" content={ogImage} />
        <meta property="og:site_name" content="lomi." />
        {publishedAt && (
          <meta property="article:published_time" content={publishedAt} />
        )}

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={title} />
        {description && (
          <meta name="twitter:description" content={description} />
        )}
        <meta name="twitter:image" content={ogImage} />
        {authorName && <meta name="twitter:label1" content="Written by" />}
        {authorName && <meta name="twitter:data1" content={authorName} />}
      </Helmet>

      <div className="overflow-hidden relative bg-background">
        <GridSystem />

        <main className="relative z-10 min-h-screen">{children}</main>

        <Footer />
      </div>
    </>
  );
}
