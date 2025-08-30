"use client";

import React, { ReactNode } from "react";
import { Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TitleBoxProps {
  children: ReactNode;
  boxText?: string;
  title: string;
  slug: string;
  date?: string;
  author?: string;
  categories?: string[];
}

export default function TitleBox({
  children,
  title,
  slug,
  date,
  author,
  categories,
}: TitleBoxProps) {
  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/stories/${slug}`
      : `/stories/${slug}`;

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: title,
          url: shareUrl,
        });
      } catch (error) {
        console.log("Error sharing:", error);
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(shareUrl);
    }
  };

  return (
    <section className="relative border-b-2 border-border py-6 md:py-8">
      <div className="grid md:flex flex-col justify-between items-start auto-rows-fr grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
        {/* Left side - Content */}
        <div className="md:col-span-2">{children}</div>

        {/* Right side - Meta info and share */}
        <div className="flex flex-col items-start md:items-end gap-4">
          {/* Date and Author */}
          <div className="text-sm text-muted-foreground space-y-1 text-left md:text-right">
            {date && (
              <p className="font-medium">
                {new Date(date).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            )}
            {author && <p className="text-primary">By {author}</p>}
          </div>

          {/* Categories */}
          {categories && categories.length > 0 && (
            <div className="flex flex-wrap gap-2 justify-start md:justify-end">
              {categories.map((category, index) => (
                <span
                  key={index}
                  className="px-3 py-1 text-xs font-medium bg-secondary text-secondary-foreground rounded-sm border border-border"
                >
                  {category}
                </span>
              ))}
            </div>
          )}

          {/* Share button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleShare}
            className="flex items-center gap-2"
          >
            <Share2 className="h-4 w-4" />
            Share
          </Button>
        </div>
      </div>
    </section>
  );
}
