"use client";

import React, { useState, useRef, useEffect } from "react";
import { Volume2, VolumeX, ChevronLeft, ChevronRight } from "lucide-react"; // Import icons

// Define props interface
interface BackgroundVideoProps {
  videoUrls: string[];
}

export default function BackgroundVideo({ videoUrls }: BackgroundVideoProps) {
  // State to manage sound, default to muted
  const [isMuted, setIsMuted] = useState(false);
  const [current, setCurrent] = useState(0);
  const [isPortrait, setIsPortrait] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null); // Create a ref for the video element
  const bgVideoRef = useRef<HTMLVideoElement>(null);

  // Detect aspect ratio on video load
  function handleLoadedMetadata() {
    const video = videoRef.current;
    if (video) {
      setIsPortrait(video.videoHeight > video.videoWidth);
    }
  }

  // Toggle mute
  function toggleSound() {
    const video = videoRef.current;
    if (video) {
      video.muted = !video.muted;
      setIsMuted(video.muted);
    }
  }

  // Keep video muted state in sync
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
    }
  }, [isMuted]);

  // Navigation logic
  function goTo(idx: number) {
    if (!videoUrls.length) return;
    // On mobile, allow seamless looping; on desktop, clamp between 0 and last
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setCurrent((idx + videoUrls.length) % videoUrls.length);
    } else {
      setCurrent(Math.max(0, Math.min(idx, videoUrls.length - 1)));
    }
  }
  function next() {
    goTo(current + 1);
  }
  function prev() {
    goTo(current - 1);
  }

  // No videos: render nothing
  if (!videoUrls || videoUrls.length === 0) {
    console.warn("Homepage background video URLs not provided.");
    return null;
  }

  // Only one video: no navigation
  const showNav = videoUrls.length > 1;

  // Responsive: use object-cover on mobile, object-contain+blurred bg for portrait on desktop
  // Tailwind: md: means desktop and up
  // We'll use a wrapper div to conditionally render the blurred background

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden">
      {/* Blurred background for portrait on desktop only */}
      <div className="hidden md:block absolute inset-0 w-full h-full z-0 pointer-events-none">
        {isPortrait && (
          <video
            ref={bgVideoRef}
            src={videoUrls[current]}
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover blur-2xl scale-110 brightness-75"
            aria-hidden
          />
        )}
        {/* fallback color if not portrait or video not loaded */}
        {!isPortrait && <div className="w-full h-full bg-black" />}
      </div>

      {/* Foreground video */}
      <video
        ref={videoRef}
        autoPlay
        loop
        muted={isMuted}
        playsInline
        className={`absolute top-0 left-0 w-full h-full z-10
          ${isPortrait ? "object-contain md:object-contain" : "object-cover"}
          object-cover md:object-cover
        `}
        src={videoUrls[current]}
        key={videoUrls[current]} // force reload on change
        onLoadedMetadata={handleLoadedMetadata}
      >
        Your browser does not support the video tag.
      </video>

      {/* Sound Toggle Button */}
      <button
        onClick={toggleSound}
        className="absolute bottom-4 right-4 z-20 p-2 bg-black/10 hover:bg-black/30 rounded-sm text-white focus:outline-none transition-colors duration-200"
        aria-label={isMuted ? "Unmute video" : "Mute video"}
      >
        {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
      </button>

      {/* Navigation Arrows (now visible on all screen sizes) */}
      {showNav && (
        <>
          {/* Show left arrow only if current > 0 */}
          {current > 0 && (
            <button
              onClick={prev}
              className="flex absolute left-4 top-1/2 -translate-y-1/2 z-20 p-2 bg-black/10 hover:bg-black/30 rounded-sm text-white focus:outline-none transition-colors duration-200"
              aria-label="Previous video"
              tabIndex={0}
            >
              <ChevronLeft size={22} />
            </button>
          )}
          {/* Show right arrow only if current < last */}
          {current < videoUrls.length - 1 && (
            <button
              onClick={next}
              className="flex absolute right-4 top-1/2 -translate-y-1/2 z-20 p-2 bg-black/10 hover:bg-black/30 rounded-sm text-white focus:outline-none transition-colors duration-200"
              aria-label="Next video"
              tabIndex={0}
            >
              <ChevronRight size={22} />
            </button>
          )}
        </>
      )}

      {/* Dot Indicator - now square with rounded-sm */}
      {showNav && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20">
          {videoUrls.map((_, idx) => (
            <button
              key={idx}
              onClick={() => goTo(idx)}
              className={`w-2 h-2 rounded-sm border border-white transition-all duration-200 ${idx === current ? "bg-white" : "bg-white/30"}`}
              aria-label={`Go to video ${idx + 1}`}
              tabIndex={0}
            />
          ))}
        </div>
      )}

      {/* Optional: Add an overlay for text contrast */}
      {/* <div className="absolute inset-0 bg-black opacity-30"></div> */}
    </div>
  );
}
