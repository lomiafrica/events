import * as React from "react";
import { cn } from "@/lib/actions/utils";
import { balloons, textBalloons } from "balloons-js";

export interface BalloonsProps {
  type?: "default" | "text";
  text?: string;
  fontSize?: number;
  color?: string;
  className?: string;
  onLaunch?: () => void;
}

// Define the type for the imperative handle
export interface BalloonsHandle {
  launchAnimation: () => void;
  containerElement: HTMLDivElement | null; // Expose the container element
}

const Balloons = React.forwardRef<BalloonsHandle, BalloonsProps>( // Update ref type here
  (
    {
      type = "default",
      text,
      fontSize = 120,
      color = "#000000",
      className,
      onLaunch,
    },
    ref,
  ) => {
    const containerRef = React.useRef<HTMLDivElement>(null);

    const launchAnimation = React.useCallback(() => {
      // Add a check for containerRef.current existence if balloons-js needs it
      // Although balloons-js typically appends to body, let's keep the container logic simple
      if (type === "default") {
        balloons();
      } else if (type === "text" && text) {
        textBalloons([
          {
            text,
            fontSize,
            color,
          },
        ]);
      }

      if (onLaunch) {
        onLaunch();
      }
    }, [type, text, fontSize, color, onLaunch]);

    // Expose the launch function and the container element via the ref
    React.useImperativeHandle(
      ref,
      () => ({
        launchAnimation,
        containerElement: containerRef.current, // Expose the element instance
      }),
      [launchAnimation], // Dependency array includes launchAnimation
    );

    // The container div itself is mainly for structure and styling via className
    return (
      <div ref={containerRef} className={cn("balloons-container", className)} />
    );
  },
);
Balloons.displayName = "Balloons";

export { Balloons };
