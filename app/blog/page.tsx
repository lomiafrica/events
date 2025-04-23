import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getAllBlogPosts } from "@/lib/sanity/queries";
import Header from "@/components/landing/header";
import Footer from "@/components/landing/footer";

// Define a type for blog posts
interface BlogPost {
  _id: string;
  title: string;
  slug: string;
  excerpt: string;
  publishedAt: string;
  mainImage?: {
    url: string;
  };
}

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Latest news, event recaps, and entertainment insights from Djaouli Entertainment",
};

export default async function BlogPage() {
  const posts = await getAllBlogPosts();

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow">
        <div className="container mx-auto py-26 px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {posts.map((post: BlogPost) => (
              <Card key={post._id} className="overflow-hidden flex flex-col h-full">
                <div className="relative h-60">
                  <Image
                    src={
                      post.mainImage?.url || "/placeholder.webp?height=400&width=600"
                    }
                    alt={post.title}
                    fill
                    className="object-cover"
                  />
                </div>
                <CardContent className="p-6 flex-1 flex flex-col">
                  <div className="text-sm text-muted-foreground mb-2">
                    {new Date(post.publishedAt).toLocaleDateString()}
                  </div>
                  <h3 className="text-xl font-bold mb-2">{post.title}</h3>
                  <p className="text-muted-foreground mb-4 flex-1">
                    {post.excerpt}
                  </p>
                  <Button variant="outline" asChild className="mt-auto">
                    <Link href={`/blog/${post.slug}`}>Read More</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
