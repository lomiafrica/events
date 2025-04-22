"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner, toast as sonnerToast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          actionButton:
            "group-[.toaster]:bg-primary group-[.toaster]:text-primary-foreground",
        },
        style: {
          width: "115px",
          maxWidth: "32%",
          padding: "2px",
          marginBottom: "76%",
        },
      }}
      position="bottom-right"
      {...props}
    />
  );
};

export { Toaster, sonnerToast as toast };
