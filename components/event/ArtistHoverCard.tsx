"use client";

import { useState, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { IG } from '@/components/icons/IG';

interface Artist {
    _id: string;
    name: string;
    bio?: string;
    image?: string; // Expected to be a URL
    socialLink?: string;
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
                        className="absolute z-20 top-0 left-full ml-4 w-64 max-w-xs bg-slate-800 border border-slate-700 rounded-lg shadow-xl overflow-hidden transition-opacity duration-200 ease-in-out"
                        onMouseEnter={handleMouseEnter}
                        onMouseLeave={handleMouseLeave}
                    >
                        {artist.image && (
                            <div className="relative w-full aspect-video">
                                <Image
                                    src={artist.image}
                                    alt={`${artist.name ?? 'Artist'}'s image`}
                                    layout="fill"
                                    objectFit="cover"
                                />
                                <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 via-black/60 to-transparent">
                                    <div className="flex justify-between items-center">
                                        <h4 className="font-semibold text-base text-white truncate pr-2">
                                            {artist.name}
                                        </h4>
                                        {artist.socialLink && (
                                            <Link
                                                href={artist.socialLink}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                aria-label={`${artist.name ?? 'Artist'}'s social media`}
                                                className="text-white hover:text-[#E4405F] transition-colors flex-shrink-0"
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
                                <div className="flex items-center justify-between mb-2">
                                    <h4 className="font-semibold text-lg text-gray-100 truncate">
                                        {artist.name}
                                    </h4>
                                    {artist.socialLink ? (
                                        <Link
                                            href={artist.socialLink}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            aria-label={`${artist.name ?? 'Artist'}'s social media`}
                                            className="text-gray-300 hover:text-[#E4405F] transition-colors flex-shrink-0"
                                        >
                                            <IG className="h-6 w-6" />
                                        </Link>
                                    ) : (
                                        <div />
                                    )}
                                </div>
                            )}
                            {artist.bio && (
                                <p className="text-gray-300 my-2 text-xs leading-relaxed">
                                    {artist.bio}
                                </p>
                            )}
                            {artist.image && !artist.bio && (
                                <p className="text-gray-400 text-xs italic py-2">No bio available.</p>
                            )}
                            {!artist.image && !artist.bio && !artist.socialLink && (
                                <p className="text-gray-400 text-xs italic py-2">No additional details available.</p>
                            )}
                        </div>
                    </div>
                )}
            </span>
        </li>
    );
} 