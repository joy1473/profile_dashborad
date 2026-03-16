import { Skeleton } from "@/components/ui/skeleton";

export function GraphSkeleton() {
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-9 w-48 rounded-lg" />
      </div>

      {/* Filters */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-20 rounded-full" />
        ))}
      </div>

      {/* Canvas area */}
      <Skeleton className="min-h-[400px] w-full rounded-lg" style={{ height: "calc(100vh - 320px)" }} />
    </div>
  );
}
