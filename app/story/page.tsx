import Image from "next/image";
import { PortableText } from "@portabletext/react";
import { getStory } from "@/lib/sanity/queries";
import { notFound } from "next/navigation";

export default async function StoryPage() {
  const story = await getStory();

  if (!story) {
    notFound();
  }

  return (
    <div className="container mx-auto py-12 px-4 max-w-4xl">
      <h1 className="text-4xl font-bold mb-4">{story.title}</h1>
      <p className="text-xl text-muted-foreground mb-8">{story.subtitle}</p>

      {story.image && (
        <div className="relative aspect-video mb-8 rounded-md overflow-hidden">
          <Image
            src={story.image.url || "/placeholder.webp"}
            alt={story.image.alt || story.title}
            fill
            priority
            className="object-cover"
          />
        </div>
      )}

      <div className="prose prose-lg max-w-none">
        <PortableText value={story.content} />
      </div>
    </div>
  );
}
