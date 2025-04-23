import Image from "next/image";
import Link from "next/link";
import { PortableText, PortableTextBlock } from "@portabletext/react";

import { Button } from "../ui/button";

type StoryProps = {
  title: string;
  subtitle: string;
  content: PortableTextBlock[];
  image: {
    url: string;
    alt: string;
  };
};

export default function FeaturedStory({ story }: { story: StoryProps }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
      <div className="relative h-[400px] rounded-md overflow-hidden">
        <Image
          src={story.image?.url || "/placeholder.webp?height=800&width=600"}
          alt={story.image?.alt || "Djaouli Entertainment Story"}
          fill
          className="object-cover"
        />
      </div>

      <div>
        <h3 className="text-2xl font-bold mb-2">{story.title}</h3>
        <p className="text-lg text-muted-foreground mb-4">{story.subtitle}</p>

        <div className="prose prose-sm max-w-none mb-6 line-clamp-4">
          <PortableText value={story.content} />
        </div>

        <Button variant="outline" asChild>
          <Link href="/story">Read More</Link>
        </Button>
      </div>
    </div>
  );
}
