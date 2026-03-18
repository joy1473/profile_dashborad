"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardTitle, CardValue } from "@/components/ui/card";
import { CategoryChart } from "@/components/charts/category-chart";
import { AnalyticsToolbar } from "@/components/charts/analytics-toolbar";
import { ChartRenderer } from "@/components/charts/chart-renderer";
import { UserPresence } from "@/components/dashboard/user-presence";
import { fetchMetrics } from "@/lib/metrics";
import { fetchRevenueData } from "@/lib/metrics";
import { fetchActivities } from "@/lib/activities";
import { useRealtimeIssues } from "@/hooks/use-realtime-issues";
import { cn } from "@/lib/utils";
import type { MetricCard, ChartData, Activity } from "@/types";
import type { DateRange } from "@/components/charts/date-range-picker";
import type { ChartType } from "@/components/charts/chart-type-switcher";

function subDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() - days);
  return result;
}

export default function DashboardPage() {
  const [dateRange, setDateRange] = useState<DateRange>("1y");
  const [chartType, setChartType] = useState<ChartType>("line");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const [metricsData, setMetricsData] = useState<MetricCard[]>([]);
  const [revenueData, setRevenueData] = useState<ChartData[]>([]);
  const [activitiesData, setActivitiesData] = useState<Activity[]>([]);

  useEffect(() => {
    fetchMetrics().then(setMetricsData);
    fetchRevenueData().then(setRevenueData);
    fetchActivities(5).then(setActivitiesData);
  }, []);

  // Realtime: 이슈 변경 시 활동 로그 자동 갱신
  const handleRealtimeEvent = useCallback(() => {
    fetchActivities(5).then(setActivitiesData);
  }, []);

  useRealtimeIssues(handleRealtimeEvent);

  const filteredData = useMemo(() => {
    const now = new Date();

    if (dateRange === "custom") {
      if (!customStart || !customEnd) return revenueData;
      const start = new Date(customStart);
      const end = new Date(customEnd);
      return revenueData.filter((d) => {
        const date = new Date(d.date as string);
        return date >= start && date <= end;
      });
    }

    const daysMap: Record<string, number> = { "7d": 7, "30d": 30, "90d": 90, "1y": 365 };
    const startDate = subDays(now, daysMap[dateRange]);
    return revenueData.filter((d) => new Date(d.date as string) >= startDate);
  }, [dateRange, customStart, customEnd, revenueData]);

  return (
    <div>
      <h2 className="mb-6 text-2xl font-bold text-zinc-900 dark:text-zinc-50" data-testid="page-title">대시보드</h2>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4" data-testid="metrics-grid">
        {metricsData.map((metric) => (
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

      <AnalyticsToolbar
        dateRange={dateRange}
        onDateRangeSelect={setDateRange}
        customStart={customStart}
        customEnd={customEnd}
        onCustomStartChange={setCustomStart}
        onCustomEndChange={setCustomEnd}
        chartType={chartType}
        onChartTypeSelect={setChartType}
        data={filteredData}
      />

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <Card data-testid="revenue-chart">
          <h3 className="mb-4 text-sm font-medium text-zinc-500 dark:text-zinc-400">매출 추이</h3>
          <div className="h-72">
            <ChartRenderer data={filteredData} type={chartType} />
          </div>
        </Card>
        <CategoryChart />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card data-testid="activity-feed">
            <h3 className="mb-4 text-sm font-medium text-zinc-500 dark:text-zinc-400">최근 활동</h3>
            <div className="space-y-4">
              {activitiesData.map((activity) => (
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
        <UserPresence />
      </div>
    </div>
  );
}
