import { Skeleton } from "@/components/ui/skeleton";

function SidebarSkeleton() {
  return (
    <aside className="fixed left-0 top-0 z-40 hidden h-full w-64 border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 lg:block">
      <div className="flex h-16 items-center border-b border-zinc-200 px-6 dark:border-zinc-800">
        <Skeleton className="h-6 w-36" />
      </div>
      <div className="mt-6 space-y-2 px-3">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded-lg" />
        ))}
      </div>
    </aside>
  );
}

function HeaderSkeleton() {
  return (
    <div className="flex h-16 items-center justify-between border-b border-zinc-200 px-6 dark:border-zinc-800">
      <Skeleton className="h-8 w-64 rounded-lg" />
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-8 rounded-full" />
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <SidebarSkeleton />
      <div className="lg:pl-64">
        <HeaderSkeleton />
        <main className="p-6">
          <Skeleton className="mb-6 h-8 w-32" />

          {/* Metric cards */}
          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
                <Skeleton className="h-4 w-20" />
                <div className="mt-3 flex items-end justify-between">
                  <Skeleton className="h-8 w-24" />
                  <Skeleton className="h-4 w-12" />
                </div>
              </div>
            ))}
          </div>

          {/* Charts */}
          <div className="mb-6 grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
              <Skeleton className="mb-4 h-4 w-24" />
              <Skeleton className="h-64 w-full rounded-lg" />
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
              <Skeleton className="mb-4 h-4 w-28" />
              <Skeleton className="h-64 w-full rounded-lg" />
            </div>
          </div>

          {/* Activity feed */}
          <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
            <Skeleton className="mb-4 h-4 w-20" />
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between border-b border-zinc-100 pb-3 last:border-0 dark:border-zinc-800">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                  <Skeleton className="h-3 w-16" />
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
