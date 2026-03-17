"use client";

import {
  BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import type { ChartDef } from "@/types/report";

const DEFAULT_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

interface DynamicChartProps {
  chartDef: ChartDef;
  data: Record<string, string | number>[];
}

export function DynamicChart({ chartDef, data }: DynamicChartProps) {
  const colors = chartDef.colors ?? DEFAULT_COLORS;

  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-zinc-400">
        데이터가 없습니다
      </div>
    );
  }

  const commonProps = {
    data,
    margin: { top: 5, right: 20, left: 10, bottom: 5 },
  };

  const renderAxes = () => (
    <>
      <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
      <XAxis dataKey={chartDef.xKey} fontSize={12} stroke="#a1a1aa" />
      <YAxis fontSize={12} stroke="#a1a1aa" />
      <Tooltip />
      <Legend />
    </>
  );

  if (chartDef.type === "bar") {
    return (
      <ResponsiveContainer width="100%" height={280}>
        <BarChart {...commonProps}>
          {renderAxes()}
          {chartDef.yKeys.map((key, i) => (
            <Bar key={key} dataKey={key} fill={colors[i % colors.length]} radius={[4, 4, 0, 0]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    );
  }

  if (chartDef.type === "line") {
    return (
      <ResponsiveContainer width="100%" height={280}>
        <LineChart {...commonProps}>
          {renderAxes()}
          {chartDef.yKeys.map((key, i) => (
            <Line key={key} type="monotone" dataKey={key} stroke={colors[i % colors.length]} strokeWidth={2} dot={false} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    );
  }

  if (chartDef.type === "area") {
    return (
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart {...commonProps}>
          {renderAxes()}
          {chartDef.yKeys.map((key, i) => (
            <Area key={key} type="monotone" dataKey={key} stroke={colors[i % colors.length]} fill={`${colors[i % colors.length]}33`} />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  if (chartDef.type === "pie") {
    return (
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie
            data={data}
            dataKey={chartDef.yKeys[0]}
            nameKey={chartDef.xKey}
            cx="50%"
            cy="50%"
            outerRadius={100}
            label
          >
            {data.map((_, i) => (
              <Cell key={i} fill={colors[i % colors.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    );
  }

  return null;
}
