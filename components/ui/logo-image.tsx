"use client";

import Image from "next/image";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function LogoImage({
  width = 40,
  height = 40,
}: {
  width?: number;
  height?: number;
}) {
  const { resolvedTheme } = useTheme();
  const [logoSrc, setLogoSrc] = useState("/white.svg"); // Default or initial guess

  useEffect(() => {
    // Set the logo based on the resolved theme
    setLogoSrc(resolvedTheme === "dark" ? "/dark.svg" : "/white.svg");
  }, [resolvedTheme]);

  // Avoid hydration mismatch by ensuring the correct logo is ready client-side
  if (!resolvedTheme) {
    // Or return a placeholder/null during server render/initial mount
    return (
      <div
        style={{ width: `${width}px`, height: `${height}px` }}
        aria-hidden="true"
      />
    );
  }

  return (
    <Image
      src={logoSrc}
      alt="Djaouli Entertainment Logo"
      width={width}
      height={height}
      priority // Mark as priority if it's likely LCP in the footer
    />
  );
}
