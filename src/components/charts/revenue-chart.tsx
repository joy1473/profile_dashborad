"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { revenueData } from "@/lib/mock-data";
import { Card } from "@/components/ui/card";

export function RevenueChart() {
  return (
    <Card data-testid="revenue-chart">
      <h3 className="mb-4 text-sm font-medium text-zinc-500 dark:text-zinc-400">매출 추이</h3>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={revenueData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
            <XAxis dataKey="name" fontSize={12} stroke="#a1a1aa" />
            <YAxis fontSize={12} stroke="#a1a1aa" />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} name="매출 (만원)" />
            <Line type="monotone" dataKey="users" stroke="#10b981" strokeWidth={2} name="사용자" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
