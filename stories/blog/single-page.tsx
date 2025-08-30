"use client";

import React, { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SinglePageProps {
  title: string;
  coverImage?: string;
  coverImageAlt?: string;
  withBackButton?: boolean;
  backHref?: string;
  children: ReactNode;
}

const SinglePage = ({
  title,
  coverImage,
  coverImageAlt,
  withBackButton = false,
  backHref = "/stories",
  children,
}: SinglePageProps) => {
  return (
    <article className="min-h-screen">
      {/* Cover Image Section */}
      {coverImage && (
        <div className="relative h-96 md:h-[60vh] w-full overflow-hidden">
          <Image
            src={coverImage}
            alt={coverImageAlt || title}
            fill
            priority
            className="object-cover"
          />
          {/* Overlay for better text readability */}
          <div className="absolute inset-0 bg-black/20" />

          {/* Back button */}
          {withBackButton && (
            <div className="absolute top-6 left-6 z-10">
              <Button
                variant="secondary"
                size="sm"
                asChild
                className="bg-background/80 backdrop-blur-sm hover:bg-background/90"
              >
                <Link href={backHref} className="flex items-center gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Stories
                </Link>
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <div className="relative">{children}</div>
    </article>
  );
};

export default SinglePage;
