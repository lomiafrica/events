import { Skeleton } from "@/components/ui/skeleton";

export const ProductCardSkeleton = () => {
  return (
    <div className="relative w-full aspect-[3/4] md:aspect-square bg-muted overflow-hidden">
      <Skeleton className="w-full h-full" />
      <div className="absolute inset-0 p-2 w-full">
        <div className="flex absolute inset-x-3 bottom-3 flex-col gap-8 px-2 py-3 rounded-sm bg-popover">
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 items-end">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-6 w-1/2 place-self-end" />
            <Skeleton className="h-10 w-full col-start-2" />
          </div>
        </div>
      </div>
    </div>
  );
};
