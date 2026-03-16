import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <Skeleton className="h-8 w-20" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-14 rounded-lg" />
          <Skeleton className="h-8 w-14 rounded-lg" />
          <Skeleton className="h-8 w-14 rounded-lg" />
        </div>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800">
                <th className="pb-3 text-left"><Skeleton className="h-4 w-12" /></th>
                <th className="pb-3 text-left"><Skeleton className="h-4 w-16" /></th>
                <th className="pb-3 text-left"><Skeleton className="h-4 w-10" /></th>
                <th className="pb-3 text-left"><Skeleton className="h-4 w-10" /></th>
                <th className="pb-3 text-left"><Skeleton className="h-4 w-12" /></th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: rows }).map((_, i) => (
                <tr key={i} className="border-b border-zinc-100 last:border-0 dark:border-zinc-800">
                  <td className="py-3"><Skeleton className="h-4 w-20" /></td>
                  <td className="py-3"><Skeleton className="h-4 w-36" /></td>
                  <td className="py-3"><Skeleton className="h-5 w-12 rounded-full" /></td>
                  <td className="py-3"><Skeleton className="h-5 w-12 rounded-full" /></td>
                  <td className="py-3"><Skeleton className="h-4 w-20" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
