"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";
import { Card } from "@/components/ui/card";
import { revenueData } from "@/lib/mock-data";

export default function AnalyticsPage() {
  return (
    <div>
      <h2 className="mb-6 text-2xl font-bold text-zinc-900 dark:text-zinc-50" data-testid="page-title">분석</h2>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <Card data-testid="bar-chart">
          <h3 className="mb-4 text-sm font-medium text-zinc-500 dark:text-zinc-400">월별 매출 비교</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                <XAxis dataKey="name" fontSize={12} stroke="#a1a1aa" />
                <YAxis fontSize={12} stroke="#a1a1aa" />
                <Tooltip />
                <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} name="매출 (만원)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card data-testid="area-chart">
          <h3 className="mb-4 text-sm font-medium text-zinc-500 dark:text-zinc-400">사용자 증가 추이</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                <XAxis dataKey="name" fontSize={12} stroke="#a1a1aa" />
                <YAxis fontSize={12} stroke="#a1a1aa" />
                <Tooltip />
                <Area type="monotone" dataKey="users" stroke="#10b981" fill="#10b98133" name="사용자 수" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}
