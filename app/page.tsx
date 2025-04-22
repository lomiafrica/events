import ImageScroller from '@/components/ui/ImageScroller';
import { getLatestBlogPosts } from "@/lib/sanity/queries"
import Header from "@/components/landing/header"
import Footer from "@/components/landing/footer"

// Re-add Post interface definition (assuming it matches ImageScroller's needs)
interface Post {
  _id: string;
  title: string;
  slug: string;
  featuredImage: string; // Ensure this matches ImageScroller's expected prop
  excerpt?: string;
  section?: { name: string; slug: string };
  category?: { name: string; slug: string };
  credits?: string;
  author?: { name: string };
  publishedAt?: string;
  recommendationTag?: string;
  recommendedArticles?: Post[]; // Assuming recursive Post structure for recommendations
}

export default async function Home() {
  const posts: Post[] = await getLatestBlogPosts(10) // Fetch more posts for the scroller

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      {/* Replace Hero Section with ImageScroller */}
      <ImageScroller images={posts} />
      <Footer />
    </div>
  )
}

