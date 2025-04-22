import { getHomepageVideoUrl } from "@/lib/sanity/queries";

export default async function BackgroundVideo() {
  const videoUrl = await getHomepageVideoUrl();

  if (!videoUrl) {
    // Optionally return a fallback background or null
    console.warn("Homepage background video URL not found in Sanity.");
    return null;
  }

  return (
    <div className="fixed inset-0 w-full h-full overflow-hidden z-[-1]">
      <video
        autoPlay
        loop
        muted
        playsInline // Important for mobile playback
        className="absolute top-0 left-0 w-full h-full object-cover"
        src={videoUrl}
      >
        {/* Optional: Provide fallback content or tracks */}
        Your browser does not support the video tag.
      </video>
      {/* Optional: Add an overlay for text contrast */}
      {/* <div className="absolute inset-0 bg-black opacity-30"></div> */}
    </div>
  );
}
