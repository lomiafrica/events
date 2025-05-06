"use client";

import React, { useState, useRef, useEffect } from "react";
import { Volume2, VolumeX } from "lucide-react"; // Import icons

// Define props interface
interface BackgroundVideoProps {
  videoUrl: string | null;
}

export default function BackgroundVideo({ videoUrl }: BackgroundVideoProps) {
  // State to manage sound, default to muted
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null); // Create a ref for the video element

  // Define toggleSound and useEffect at the top level
  const toggleSound = () => {
    const video = videoRef.current;
    if (video) {
      video.muted = !video.muted;
      setIsMuted(video.muted);
    }
  };

  useEffect(() => {
    // This effect ensures the video's muted state matches the React state
    // especially on initial mount or if state changes externally.
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
    }
  }, [isMuted]);

  // Conditional return for missing videoUrl remains
  if (!videoUrl) {
    console.warn("Homepage background video URL not provided.");
    return null;
  }

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden">
      <video
        ref={videoRef} // Attach the ref here
        autoPlay
        loop
        muted={isMuted} // Keep this for initial state and accessibility
        playsInline // Important for mobile playback
        className="absolute top-0 left-0 w-full h-full object-cover"
        src={videoUrl}
      >
        Your browser does not support the video tag.
      </video>

      {/* Sound Toggle Button - Removed focus ring styles */}
      <button
        onClick={toggleSound}
        className="absolute bottom-4 right-4 z-20 p-2 bg-black/10 hover:bg-black/30 rounded-sm text-white focus:outline-none transition-colors duration-200"
        aria-label={isMuted ? "Unmute video" : "Mute video"}
      >
        {isMuted ? (
          <VolumeX size={18} /> // Muted icon (adjust size as needed)
        ) : (
          <Volume2 size={18} /> // Unmuted icon (adjust size as needed)
        )}
      </button>

      {/* Optional: Add an overlay for text contrast */}
      {/* <div className="absolute inset-0 bg-black opacity-30"></div> */}
    </div>
  );
}
