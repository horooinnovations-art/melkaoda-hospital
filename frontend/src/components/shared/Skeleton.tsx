import { cn } from "@/lib/utils";

/**
 * Loading placeholders.
 *
 * `.nv-skel` is a plate well crossed by one colourless sweep — the same motion
 * the cards use on hover. The previous version tinted slate and sky over white,
 * which disappeared entirely once the canvas went charcoal.
 */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("nv-skel", className)} />;
}

export function GridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="nv-grid-3">
      {Array.from({ length: count }).map((_, i) => (
        // The frame matches `.nv-card`'s edges and radius, so the grid does not
        // reflow when the real data lands.
        <div key={i} className="nv-skel-card p-3">
          <Skeleton className="aspect-[5/4] w-full rounded-[14px]" />
          <div className="space-y-3 px-2 py-4">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-4/5" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function DetailSkeleton() {
  return (
    <div className="space-y-7">
      <Skeleton className="aspect-[21/9] w-full rounded-[18px]" />
      <div className="flex gap-3">
        <Skeleton className="h-8 w-28 rounded-full" />
        <Skeleton className="h-8 w-24 rounded-full" />
      </div>
      <Skeleton className="h-11 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  );
}
