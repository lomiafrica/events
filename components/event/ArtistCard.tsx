"use client";

import Image from "next/image";
import Link from "next/link";
import { IG } from "@/components/icons/IG";
import { t } from "@/lib/i18n/translations";

interface Artist {
  _id: string;
  name: string;
  bio?: string;
  image?: string;
  socialLink?: string;
  isResident?: boolean;
}

interface ArtistCardProps {
  artist: Artist;
  currentLanguage: string;
}

export default function ArtistCard({
  artist,
  currentLanguage,
}: ArtistCardProps) {
  const cardBaseClasses =
    "flex flex-col w-88 max-w-xs bg-grey-900 border border-slate-700 rounded-lg shadow-xl overflow-hidden";
  const artistDisplayName = artist.name || "Artist";

  return (
    <div className={cardBaseClasses}>
      {artist.image && (
        <div className="relative w-full aspect-[1/1]">
          <Image
            src={artist.image}
            alt={t(currentLanguage, "artistCard.imageAlt", {
              artistName: artistDisplayName,
            })}
            layout="fill"
            objectFit="cover"
            priority
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
                    {t(currentLanguage, "artistCard.residentBadge")}
                  </div>
                )}
              </div>
              {artist.socialLink && (
                <Link
                  href={artist.socialLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={t(currentLanguage, "artistCard.socialAriaLabel", {
                    artistName: artistDisplayName,
                  })}
                  className="text-white hover:text-[#E4405F] transition-colors flex-shrink-0 ml-2"
                >
                  <IG className="h-5 w-5" />
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
      <div className="p-4 flex-grow flex flex-col">
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
                  {t(currentLanguage, "artistCard.residentBadge")}
                </div>
              )}
            </div>
            {artist.socialLink && (
              <Link
                href={artist.socialLink}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t(currentLanguage, "artistCard.socialAriaLabel", {
                  artistName: artistDisplayName,
                })}
                className="text-gray-300 hover:text-[#E4405F] transition-colors flex-shrink-0 ml-2"
              >
                <IG className="h-6 w-6" />
              </Link>
            )}
          </div>
        )}
        {artist.bio && (
          <div
            className={`text-gray-300 text-sm leading-relaxed space-y-1 flex-grow ${artist.image ? "pt-0" : "my-2"} h-20 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-500 scrollbar-track-slate-800`}
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
          <p className="text-gray-400 text-xs italic pt-1 pb-2 flex-grow flex items-end">
            {t(currentLanguage, "artistCard.noBio")}
          </p>
        )}
        {!artist.image && !artist.bio && !artist.socialLink && (
          <p className="text-gray-400 text-xs italic flex-grow flex items-center justify-center">
            {t(currentLanguage, "artistCard.noDetails")}
          </p>
        )}
        {!artist.image && !artist.bio && artist.socialLink && (
          <p className="text-gray-400 text-xs italic mt-2 flex-grow flex items-end">
            {t(currentLanguage, "artistCard.noBio")}
          </p>
        )}
      </div>
    </div>
  );
}
