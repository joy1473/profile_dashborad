"use client";

import { DateRangePicker, type DateRange } from "./date-range-picker";
import { ChartTypeSwitcher, type ChartType } from "./chart-type-switcher";
import { ExportButton } from "./export-button";
import type { ChartData } from "@/types";

interface AnalyticsToolbarProps {
  dateRange: DateRange;
  onDateRangeSelect: (range: DateRange) => void;
  customStart: string;
  customEnd: string;
  onCustomStartChange: (date: string) => void;
  onCustomEndChange: (date: string) => void;
  chartType: ChartType;
  onChartTypeSelect: (type: ChartType) => void;
  data: ChartData[];
}

export function AnalyticsToolbar({
  dateRange,
  onDateRangeSelect,
  customStart,
  customEnd,
  onCustomStartChange,
  onCustomEndChange,
  chartType,
  onChartTypeSelect,
  data,
}: AnalyticsToolbarProps) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3" data-testid="analytics-toolbar">
      <DateRangePicker
        selected={dateRange}
        onSelect={onDateRangeSelect}
        customStart={customStart}
        customEnd={customEnd}
        onCustomStartChange={onCustomStartChange}
        onCustomEndChange={onCustomEndChange}
      />
      <div className="flex items-center gap-2">
        <ChartTypeSwitcher selected={chartType} onSelect={onChartTypeSelect} />
        <ExportButton data={data} />
      </div>
    </div>
  );
}
