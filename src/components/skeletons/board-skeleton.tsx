import { Skeleton } from "@/components/ui/skeleton";

const CARDS_PER_COLUMN = [3, 2, 2, 1];

export function BoardSkeleton() {
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-10 w-28 rounded-lg" />
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Skeleton className="h-9 w-48 rounded-lg" />
        <Skeleton className="h-9 w-32 rounded-lg" />
        <Skeleton className="h-9 w-32 rounded-lg" />
      </div>

      {/* Kanban columns */}
      <div className="flex gap-4 overflow-x-auto pb-4 lg:grid lg:grid-cols-4 lg:overflow-visible">
        {CARDS_PER_COLUMN.map((cardCount, colIdx) => (
          <div key={colIdx} className="flex w-72 shrink-0 flex-col lg:w-auto lg:flex-1">
            <div className="mb-3 flex items-center justify-between">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-5 w-6 rounded-full" />
            </div>
            <div className="space-y-3">
              {Array.from({ length: cardCount }).map((_, cardIdx) => (
                <div key={cardIdx} className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
                  <Skeleton className="mb-2 h-4 w-3/4" />
                  <Skeleton className="mb-3 h-3 w-1/2" />
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-5 w-12 rounded-full" />
                    <Skeleton className="h-5 w-5 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
