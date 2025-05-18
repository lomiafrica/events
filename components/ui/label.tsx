import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/actions/utils";

const labelVariants = cva(
  [
    // Base styles
    "text-sm leading-relaxed tracking-wide",
    "text-foreground/80",
    "transition-colors duration-200",
    "select-none",

    // States
    "peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
    "group-hover:text-foreground/90",
    "group-focus-within:text-foreground",
  ].join(" "),
);

const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> &
    VariantProps<typeof labelVariants>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn(labelVariants(), className)}
    {...props}
  />
));
Label.displayName = LabelPrimitive.Root.displayName;

export { Label };
