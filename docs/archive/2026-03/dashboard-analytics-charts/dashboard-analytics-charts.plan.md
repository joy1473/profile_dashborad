# Plan: Dashboard Analytics Charts

## Executive Summary

| Perspective | Description |
|-------------|-------------|
| **Problem** | Dashboard charts are static with hardcoded mock data; no date range filtering, no chart type switching, no data export. Users cannot explore data interactively. |
| **Solution** | Add date range picker (preset ranges + custom), chart type switcher (line/bar/area), and CSV export. Enhance existing Recharts components with interactive controls. |
| **Function UX Effect** | Users can filter analytics by time period, switch chart visualizations to match their preference, and export data for offline analysis. |
| **Core Value** | Transform static dashboard into an interactive analytics tool that empowers data-driven decision making. |

## 1. Background

The dashboard currently has 2 chart components:
- **RevenueChart** — LineChart showing revenue + users (Jan-Jul, hardcoded)
- **CategoryChart** — PieChart (donut) showing traffic sources (5 categories, static)

The analytics page (`/analytics`) adds BarChart and AreaChart variants but all use the same static mock data from `src/lib/mock-data.ts`. There are no interactive controls for filtering, switching chart types, or exporting data.

### Current State
- 4 chart types used: LineChart, PieChart, BarChart, AreaChart
- All data from `mock-data.ts` (no API endpoints for analytics)
- `ResponsiveContainer` with `h-72` height
- Consistent color palette: Blue, Green, Amber, Red, Purple
- Charts wrapped in custom `Card` component

## 2. Goals

| # | Goal | Priority |
|---|------|----------|
| G1 | Date range picker with preset ranges (7d, 30d, 90d, 1y, custom) | Must |
| G2 | Chart type switcher for time-series charts (line/bar/area) | Must |
| G3 | CSV export for chart data | Must |
| G4 | Extended mock data (12 months) for meaningful filtering | Must |
| G5 | Smooth chart transitions on filter/type change | Should |

## 3. Scope

### In Scope
- `DateRangePicker` component with preset buttons and custom date inputs
- `ChartTypeSwitcher` component (line/bar/area toggle)
- `ExportButton` component for CSV download
- Extended mock data: 12 months of revenue/users data
- Filter state management in analytics page
- Data filtering logic (filter by date range)
- Update dashboard page to use new interactive charts

### Out of Scope
- Real API endpoints (continue using mock data)
- Real-time data updates / WebSocket
- Drag-to-zoom or brush selection on charts
- PDF export
- Chart color theme customization

## 4. Technical Approach

### 4.1 Date Range Picker

Preset ranges with a custom date option:
- **7일** (7 days), **30일** (30 days), **90일** (90 days), **1년** (1 year), **사용자 지정** (Custom)
- Custom mode shows two `<input type="date">` fields
- Selected range filters the time-series data client-side

### 4.2 Chart Type Switcher

Icon-based toggle for time-series charts:
- Line (TrendingUp icon), Bar (BarChart3 icon), Area (Activity icon)
- Only applies to time-series charts (not PieChart)
- Uses a single `ChartRenderer` component that renders the correct Recharts chart based on selected type

### 4.3 CSV Export

- Button with Download icon
- Generates CSV from current filtered data
- Triggers browser download with filename `analytics-{date}.csv`
- Uses `Blob` + `URL.createObjectURL` (no library needed)

### 4.4 Extended Mock Data

Extend `revenueData` in `mock-data.ts` from 7 months to 12 months with realistic values for full-year filtering.

### 4.5 Analytics Toolbar

A unified toolbar component containing:
```
[DateRangePicker] [ChartTypeSwitcher] [ExportButton]
```
Placed above the chart area on the dashboard page.

## 5. Affected Files

| File | Change |
|------|--------|
| `src/lib/mock-data.ts` | Extend revenueData to 12 months |
| `src/components/charts/date-range-picker.tsx` | New — date range selector |
| `src/components/charts/chart-type-switcher.tsx` | New — line/bar/area toggle |
| `src/components/charts/export-button.tsx` | New — CSV export |
| `src/components/charts/analytics-toolbar.tsx` | New — unified toolbar |
| `src/components/charts/chart-renderer.tsx` | New — dynamic chart type renderer |
| `src/app/(dashboard)/dashboard/page.tsx` | Add toolbar + interactive charts |

## 6. Dependencies

- No new packages required
- Uses existing: `recharts`, `lucide-react`
- Native browser APIs: `Blob`, `URL.createObjectURL`, `<a download>`

## 7. Risks

| Risk | Mitigation |
|------|------------|
| Chart re-render performance on filter change | Use `useMemo` for filtered data |
| Date input inconsistency across browsers | Use `<input type="date">` with fallback formatting |
| Large CSV generation blocking UI | Data is small (12 rows max); not a concern |

## 8. Success Criteria

- [ ] Date range picker filters chart data correctly (all 5 presets + custom)
- [ ] Chart type switcher toggles between line/bar/area
- [ ] CSV export downloads correct filtered data
- [ ] 12-month mock data renders properly
- [ ] Existing PieChart (CategoryChart) unaffected
- [ ] All controls have `data-testid` for E2E testing
- [ ] Korean labels throughout
