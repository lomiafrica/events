"use client";

import React from "react";
import { cn } from "@/lib/actions/utils";

interface TagProps {
  text: string;
  variant?: "default" | "secondary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  className?: string;
}

const Tag = ({
  text,
  variant = "default",
  size = "md",
  className,
}: TagProps) => {
  return (
    <span
      className={cn(
        "inline-flex items-center font-medium border rounded-sm transition-colors",
        {
          // Variants
          "bg-primary text-primary-foreground border-primary":
            variant === "default",
          "bg-secondary text-secondary-foreground border-secondary":
            variant === "secondary",
          "border-border text-foreground bg-background": variant === "outline",
          "text-muted-foreground hover:text-foreground": variant === "ghost",

          // Sizes
          "px-2 py-1 text-xs": size === "sm",
          "px-3 py-1.5 text-sm": size === "md",
          "px-4 py-2 text-base": size === "lg",
        },
        className,
      )}
    >
      {text.toUpperCase()}
    </span>
  );
};

export default Tag;
