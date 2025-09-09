"use client";

import { useEffect, useState } from "react";

interface DebugGridProps {
  className?: string;
}

export function DebugGrid({ className }: DebugGridProps) {
  const [gridState, setGridState] = useState<"hidden" | "padded" | "unpadded">(
    "hidden",
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.shiftKey && e.key.toLowerCase() === "d") {
        setGridState((prev) => {
          if (prev === "hidden") return "padded";
          if (prev === "padded") return "unpadded";
          return "hidden";
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  if (gridState === "hidden") return null;

  return (
    <div
      className={`fixed inset-0 pointer-events-none z-50 ${
        gridState === "padded" ? "px-4 md:px-6" : ""
      } ${className || ""}`}
    >
      <div className="h-full grid grid-cols-12 gap-4 md:gap-6">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="h-full bg-red-500 opacity-20 border border-red-300"
          />
        ))}
      </div>
    </div>
  );
}
