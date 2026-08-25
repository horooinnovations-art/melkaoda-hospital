import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-2xl bg-gradient-to-br from-slate-900/8 via-sky-700/10 to-sky-700/5",
        className
      )}
    />
  );
}

export function GridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="v-frame overflow-hidden rounded-[1.5rem] bg-[#cfe7e1]/70 p-3"
          style={{ animationDelay: `${i * 60}ms` }}
        >
          <Skeleton className="aspect-[5/4] w-full rounded-[1.1rem]" />
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
    <div className="space-y-8">
      <Skeleton className="aspect-[21/9] w-full rounded-[1.75rem]" />
      <div className="flex gap-3">
        <Skeleton className="h-8 w-28 rounded-full" />
        <Skeleton className="h-8 w-24 rounded-full" />
      </div>
      <Skeleton className="h-12 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  );
}
