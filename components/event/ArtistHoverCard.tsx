"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { IG } from "@/components/icons/IG";

interface Artist {
  _id: string;
  name: string;
  bio?: string;
  image?: string; // Expected to be a URL
  socialLink?: string;
  isResident?: boolean;
}

interface ArtistHoverCardProps {
  artist: Artist;
}

export default function ArtistHoverCard({ artist }: ArtistHoverCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(false);
    }, 200);
  };

  return (
    <li className="text-gray-200 py-1 cursor-default">
      <span
        className="relative inline-flex items-center"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <span className="text-primary mr-3">◆</span>
        {artist.name}
        {isHovered && artist && (
          <div
            className="absolute z-20 bottom-full mb-2 left-full ml-4 w-64 max-w-xs bg-slate-800 border border-slate-700 rounded-sm shadow-xl overflow-hidden transition-opacity duration-200 ease-in-out"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            {artist.image && (
              <div className="relative w-full aspect-[1/1]">
                <Image
                  src={artist.image}
                  alt={`${artist.name ?? "Artist"}'s image`}
                  layout="fill"
                  objectFit="cover"
                />
                <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 via-black/60 to-transparent">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2 min-w-0">
                      <h4 className="font-semibold text-base text-white truncate">
                        {artist.name}
                      </h4>
                      {artist.isResident && (
                        <div className="inline-flex items-center px-1.5 py-0.5 text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-sm flex-shrink-0">
                          <span className="relative flex h-2 w-2 mr-1.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                          </span>
                          Resident
                        </div>
                      )}
                    </div>
                    {artist.socialLink && (
                      <Link
                        href={artist.socialLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${artist.name ?? "Artist"}'s social media`}
                        className="text-white hover:text-[#E4405F] transition-colors flex-shrink-0 ml-2"
                      >
                        <IG className="h-5 w-5" />
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            )}
            <div className="p-4">
              {!artist.image && (
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <h4 className="font-semibold text-lg text-gray-100 truncate">
                      {artist.name}
                    </h4>
                    {artist.isResident && (
                      <div className="inline-flex items-center px-1.5 py-0.5 text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-sm flex-shrink-0">
                        <span className="relative flex h-2 w-2 mr-1.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                        </span>
                        Resident
                      </div>
                    )}
                  </div>
                  {artist.socialLink && (
                    <Link
                      href={artist.socialLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`${artist.name ?? "Artist"}'s social media`}
                      className="text-gray-300 hover:text-[#E4405F] transition-colors flex-shrink-0 ml-2"
                    >
                      <IG className="h-6 w-6" />
                    </Link>
                  )}
                </div>
              )}
              {artist.bio && (
                <div
                  className={`text-gray-300 text-xs leading-relaxed space-y-1 ${artist.image ? "pt-0" : "my-2"}`}
                >
                  {artist.bio.split("\n").map((line, index) => {
                    const trimmedLine = line.trim();
                    if (trimmedLine === "") {
                      return <br key={index} />;
                    }
                    return <p key={index}>{trimmedLine}</p>;
                  })}
                </div>
              )}
              {artist.image && !artist.bio && (
                <p className="text-gray-400 text-xs italic pt-1 pb-2">
                  No bio available.
                </p>
              )}
              {!artist.image && !artist.bio && !artist.socialLink && (
                <p className="text-gray-400 text-xs italic">
                  No additional details available.
                </p>
              )}
              {!artist.image && !artist.bio && artist.socialLink && (
                <p className="text-gray-400 text-xs italic mt-2">
                  No bio available.
                </p>
              )}
              {!artist.image && artist.bio && !artist.socialLink && (
                <p className="text-gray-400 text-xs italic mt-2">
                  No social link available.
                </p>
              )}
            </div>
          </div>
        )}
      </span>
    </li>
  );
}
