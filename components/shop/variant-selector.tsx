"use client";

import { Button } from "@/components/ui/button";

// Simple variant selector for Sanity products
// This is a simplified version since Sanity doesn't have the same variant system as Shopify

interface VariantOption {
  name: string;
  value: string;
}

interface VariantSelectorProps {
  options?: VariantOption[];
  onVariantChange?: (option: VariantOption) => void;
  selectedOption?: VariantOption;
}

export function VariantSelector({
  options = [],
  onVariantChange,
  selectedOption,
}: VariantSelectorProps) {
  if (!options || options.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium">Options</h3>
      <div className="flex flex-wrap gap-2">
        {options.map((option, index) => (
          <Button
            key={index}
            variant={
              selectedOption?.value === option.value ? "default" : "outline"
            }
            size="sm"
            onClick={() => onVariantChange?.(option)}
            className="min-w-[40px]"
          >
            {option.name}: {option.value}
          </Button>
        ))}
      </div>
    </div>
  );
}
