"use client";

import { Bouncy } from "ldrs/react";
import "ldrs/react/Bouncy.css";

export default function LoadingSpinner() {
  return (
    <div className="flex justify-center items-center h-screen">
      {/* Pass the hardcoded white color */}
      <Bouncy size="35" speed="1.75" color="white" />
    </div>
  );
}
