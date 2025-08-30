import type { Metadata } from "next";
import { getAllNewsPosts } from "@/lib/queries/news";
import Header from "@/components/landing/header";
import Footer from "@/components/landing/footer";
import NewsContent from "./news-client";

export async function generateMetadata(): Promise<Metadata> {
  // For now, return static metadata - in a real app you'd get the current language
  // and return the appropriate translated metadata
  return {
    title: "Blog | Djaouli Entertainment",
    description:
      "Latest news, event recaps, and entertainment insights from Djaouli Entertainment",
  };
}

export default async function NewsPage() {
  const posts = await getAllNewsPosts();

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow">
        <NewsContent posts={posts} />
      </main>
      <Footer />
    </div>
  );
}
