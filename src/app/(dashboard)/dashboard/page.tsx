"use client";

import { TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardTitle, CardValue } from "@/components/ui/card";
import { RevenueChart } from "@/components/charts/revenue-chart";
import { CategoryChart } from "@/components/charts/category-chart";
import { metrics, activities } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
  return (
    <div>
      <h2 className="mb-6 text-2xl font-bold text-zinc-900 dark:text-zinc-50" data-testid="page-title">대시보드</h2>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4" data-testid="metrics-grid">
        {metrics.map((metric) => (
          <Card key={metric.title} data-testid={`metric-${metric.title}`}>
            <CardTitle>{metric.title}</CardTitle>
            <div className="mt-2 flex items-end justify-between">
              <CardValue>{metric.value}</CardValue>
              <span className={cn("flex items-center gap-1 text-sm font-medium", metric.trend === "up" ? "text-green-600" : "text-red-500")}>
                {metric.trend === "up" ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                {Math.abs(metric.change)}%
              </span>
            </div>
          </Card>
        ))}
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <RevenueChart />
        <CategoryChart />
      </div>

      <Card data-testid="activity-feed">
        <h3 className="mb-4 text-sm font-medium text-zinc-500 dark:text-zinc-400">최근 활동</h3>
        <div className="space-y-4">
          {activities.map((activity) => (
            <div key={activity.id} className="flex items-center justify-between border-b border-zinc-100 pb-3 last:border-0 dark:border-zinc-800">
              <div>
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">{activity.user}</p>
                <p className="text-sm text-zinc-500">
                  {activity.action} — <span className="text-zinc-700 dark:text-zinc-300">{activity.target}</span>
                </p>
              </div>
              <span className="text-xs text-zinc-400">{activity.timestamp}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
