"use client";

import {
  LineChart, Line,
  BarChart, Bar,
  AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import type { ChartData } from "@/types";
import type { ChartType } from "./chart-type-switcher";

interface ChartRendererProps {
  data: ChartData[];
  type: ChartType;
}

const SHARED_PROPS = {
  grid: { strokeDasharray: "3 3", stroke: "#e4e4e7" },
  xAxis: { dataKey: "name", fontSize: 12, stroke: "#a1a1aa" },
  yAxis: { fontSize: 12, stroke: "#a1a1aa" },
};

export function ChartRenderer({ data, type }: ChartRendererProps) {
  return (
    <div data-testid="chart-renderer">
      <ResponsiveContainer width="100%" height="100%">
        {type === "line" ? (
          <LineChart data={data}>
            <CartesianGrid {...SHARED_PROPS.grid} />
            <XAxis {...SHARED_PROPS.xAxis} />
            <YAxis {...SHARED_PROPS.yAxis} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} name="매출 (만원)" />
            <Line type="monotone" dataKey="users" stroke="#10b981" strokeWidth={2} name="사용자" />
          </LineChart>
        ) : type === "bar" ? (
          <BarChart data={data}>
            <CartesianGrid {...SHARED_PROPS.grid} />
            <XAxis {...SHARED_PROPS.xAxis} />
            <YAxis {...SHARED_PROPS.yAxis} />
            <Tooltip />
            <Legend />
            <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} name="매출 (만원)" />
            <Bar dataKey="users" fill="#10b981" radius={[4, 4, 0, 0]} name="사용자" />
          </BarChart>
        ) : (
          <AreaChart data={data}>
            <CartesianGrid {...SHARED_PROPS.grid} />
            <XAxis {...SHARED_PROPS.xAxis} />
            <YAxis {...SHARED_PROPS.yAxis} />
            <Tooltip />
            <Legend />
            <Area type="monotone" dataKey="revenue" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} strokeWidth={2} name="매출 (만원)" />
            <Area type="monotone" dataKey="users" stroke="#10b981" fill="#10b981" fillOpacity={0.3} strokeWidth={2} name="사용자" />
          </AreaChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
