import { cn } from "@/lib/actions/utils";
import { ResultsCount } from "./results-count";
import { SortDropdown } from "./sort-dropdown";

interface ResultsControlsProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  products: any[];
  className?: string;
}

export default function ResultsControls({
  products,
  className,
}: ResultsControlsProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-3 items-center mb-1 w-full px-4 md:px-6",
        className,
      )}
    >
      {/* Breadcrumb - can be added later */}
      <div className="ml-1">
        <span className="text-sm text-muted-foreground">Shop</span>
      </div>

      {/* Results count */}
      <ResultsCount count={products.length} />

      {/* Sort dropdown */}
      <SortDropdown />
    </div>
  );
}
