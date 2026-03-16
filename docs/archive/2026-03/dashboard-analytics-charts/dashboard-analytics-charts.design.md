# Design: Dashboard Analytics Charts

> Reference: [dashboard-analytics-charts.plan.md](../../01-plan/features/dashboard-analytics-charts.plan.md)

## 1. Implementation Order

```
1. mock-data.ts             — Extend revenueData to 12 months + add date field
2. date-range-picker.tsx    — Date range selector component
3. chart-type-switcher.tsx  — Line/Bar/Area toggle component
4. export-button.tsx        — CSV export component
5. analytics-toolbar.tsx    — Unified toolbar wrapper
6. chart-renderer.tsx       — Dynamic chart type renderer
7. dashboard/page.tsx       — Integrate toolbar + interactive charts
```

## 2. Data Model

### 2.1 Extended Mock Data (`mock-data.ts`)

Add `date` field (ISO string) to each data point for filtering:

```typescript
export const revenueData: ChartData[] = [
  { name: "1월", date: "2025-01-01", revenue: 3200, users: 1800 },
  { name: "2월", date: "2025-02-01", revenue: 4100, users: 2000 },
  // ... through 12월
  { name: "12월", date: "2025-12-01", revenue: 7200, users: 3100 },
];
```

12-month data with realistic growth trend. `ChartData` type in `src/types/index.ts` already supports `[key: string]: string | number` so no type changes needed.

### 2.2 Date Range Type

```typescript
// Used locally in dashboard page state — no new types file needed
type DateRange = "7d" | "30d" | "90d" | "1y" | "custom";
type ChartType = "line" | "bar" | "area";
```

## 3. Component Design

### 3.1 DateRangePicker (`src/components/charts/date-range-picker.tsx`)

```typescript
interface DateRangePickerProps {
  selected: DateRange;
  onSelect: (range: DateRange) => void;
  customStart: string;   // "YYYY-MM-DD"
  customEnd: string;     // "YYYY-MM-DD"
  onCustomStartChange: (date: string) => void;
  onCustomEndChange: (date: string) => void;
}
```

**UI Structure:**
```
[7일] [30일] [90일] [1년] [사용자 지정]
                              ↓ (when selected)
                    [시작일 input] ~ [종료일 input]
```

**Preset buttons:**
- Pill-shaped buttons with active state (bg-blue-600 text-white vs bg-zinc-100)
- `data-testid="range-{value}"` (e.g., `range-7d`, `range-custom`)

**Custom date inputs:**
- Only visible when `selected === "custom"`
- `<input type="date">` with `data-testid="custom-start"` and `data-testid="custom-end"`
- Dark mode support: `dark:bg-zinc-800 dark:border-zinc-600`

### 3.2 ChartTypeSwitcher (`src/components/charts/chart-type-switcher.tsx`)

```typescript
interface ChartTypeSwitcherProps {
  selected: ChartType;
  onSelect: (type: ChartType) => void;
}
```

**UI:** 3 icon buttons in a grouped container:

| Type | Icon (lucide) | Label |
|------|--------------|-------|
| line | `TrendingUp` | 라인 |
| bar | `BarChart3` | 막대 |
| area | `Activity` | 영역 |

**Styling:**
- Button group: `flex rounded-lg border border-zinc-200 dark:border-zinc-700`
- Active: `bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50`
- Inactive: `text-zinc-400 hover:text-zinc-600`
- `data-testid="chart-type-{type}"` on each button

### 3.3 ExportButton (`src/components/charts/export-button.tsx`)

```typescript
interface ExportButtonProps {
  data: ChartData[];
  filename?: string;  // default: "analytics"
}
```

**CSV Generation Logic:**
1. Extract all keys from first data object as headers
2. Map each row to comma-separated values
3. Join with newlines, prepend BOM for Korean Excel support (`\uFEFF`)
4. Create `Blob` with `type: "text/csv;charset=utf-8"`
5. Create temporary `<a>` with `URL.createObjectURL`, set `download` attribute, click, cleanup

**Button UI:**
- `Download` icon from lucide-react
- `data-testid="export-csv"`
- Tooltip: `title="CSV 내보내기"`

### 3.4 AnalyticsToolbar (`src/components/charts/analytics-toolbar.tsx`)

```typescript
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
```

**Layout:**
```
┌──────────────────────────────────────────────────────────────┐
│ [DateRangePicker                    ] [ChartTypeSwitcher] [📥]│
│                                                              │
│ (custom date inputs here if "사용자 지정" selected)             │
└──────────────────────────────────────────────────────────────┘
```

- `flex flex-wrap items-center gap-3`
- `DateRangePicker` takes available space, switcher + export on right
- `data-testid="analytics-toolbar"`

### 3.5 ChartRenderer (`src/components/charts/chart-renderer.tsx`)

```typescript
interface ChartRendererProps {
  data: ChartData[];
  type: ChartType;
}
```

**Renders one of three Recharts chart types based on `type`:**

```
type === "line" → <LineChart> with <Line> elements
type === "bar"  → <BarChart> with <Bar> elements
type === "area" → <AreaChart> with <Area> elements
```

**Shared configuration (same across all types):**
- `<ResponsiveContainer width="100%" height="100%">`
- `<CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />`
- `<XAxis dataKey="name" fontSize={12} stroke="#a1a1aa" />`
- `<YAxis fontSize={12} stroke="#a1a1aa" />`
- `<Tooltip />`
- `<Legend />`

**Data keys rendered:**
- `revenue` with stroke/fill `#3b82f6` (blue), name "매출 (만원)"
- `users` with stroke/fill `#10b981` (green), name "사용자"

**Chart-specific settings:**
- Line: `type="monotone"`, `strokeWidth={2}`
- Bar: default bar settings, `radius={[4, 4, 0, 0]}` for rounded tops
- Area: `type="monotone"`, `fillOpacity={0.3}`, `strokeWidth={2}`

**Container:** `data-testid="chart-renderer"`

## 4. Dashboard Page Integration

### 4.1 State Management (in `dashboard/page.tsx`)

```typescript
const [dateRange, setDateRange] = useState<DateRange>("1y");
const [chartType, setChartType] = useState<ChartType>("line");
const [customStart, setCustomStart] = useState("");
const [customEnd, setCustomEnd] = useState("");
```

### 4.2 Data Filtering Logic

```typescript
const filteredData = useMemo(() => {
  const now = new Date();
  let startDate: Date;

  switch (dateRange) {
    case "7d":  startDate = subDays(now, 7); break;
    case "30d": startDate = subDays(now, 30); break;
    case "90d": startDate = subDays(now, 90); break;
    case "1y":  startDate = subDays(now, 365); break;
    case "custom":
      if (!customStart || !customEnd) return revenueData;
      startDate = new Date(customStart);
      const endDate = new Date(customEnd);
      return revenueData.filter(d =>
        new Date(d.date as string) >= startDate && new Date(d.date as string) <= endDate
      );
  }

  return revenueData.filter(d => new Date(d.date as string) >= startDate);
}, [dateRange, customStart, customEnd]);
```

**Note:** `subDays` is a simple inline helper (no date-fns needed):
```typescript
function subDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() - days);
  return result;
}
```

### 4.3 Updated Page Layout

```tsx
<div>
  <h2>대시보드</h2>
  {/* Metrics grid — unchanged */}

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
      <h3>매출 추이</h3>
      <div className="h-72">
        <ChartRenderer data={filteredData} type={chartType} />
      </div>
    </Card>
    <CategoryChart />  {/* Unchanged — PieChart not affected */}
  </div>

  {/* Activity feed — unchanged */}
</div>
```

**Key change:** `RevenueChart` is replaced inline with `ChartRenderer` + `Card` wrapper, since `RevenueChart` was a hardcoded LineChart. The `CategoryChart` (PieChart) remains untouched.

## 5. Data Flow

```
User selects date range or chart type
  ↓
State updates in dashboard/page.tsx
  ↓
filteredData recalculated via useMemo
  ↓
ChartRenderer re-renders with new data/type
  ↓
ExportButton exports current filteredData
```

## 6. Test IDs

| Component | `data-testid` |
|-----------|--------------|
| AnalyticsToolbar | `analytics-toolbar` |
| DateRangePicker preset buttons | `range-7d`, `range-30d`, `range-90d`, `range-1y`, `range-custom` |
| Custom date inputs | `custom-start`, `custom-end` |
| ChartTypeSwitcher buttons | `chart-type-line`, `chart-type-bar`, `chart-type-area` |
| ExportButton | `export-csv` |
| ChartRenderer container | `chart-renderer` |

## 7. Edge Cases

| Case | Behavior |
|------|----------|
| Custom range with empty dates | Return full dataset (no filtering) |
| Custom start > end | Return empty dataset |
| All data filtered out | Show empty chart (Recharts handles gracefully) |
| Default state on load | `dateRange="1y"`, `chartType="line"` — shows all 12 months as line chart |
