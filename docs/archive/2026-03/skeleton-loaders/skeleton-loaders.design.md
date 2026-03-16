# Skeleton Loaders — Design

> Plan 참조: `docs/01-plan/features/skeleton-loaders.plan.md`

## 1. 개요

기존 border-spinner 로딩 UI를 콘텐츠 윤곽을 미리 보여주는 Skeleton 컴포넌트로 교체한다. Tailwind `animate-pulse` 기반으로 외부 의존성 없이 구현한다.

## 2. 파일 구조

### 2.1 새 파일 (5개)

| 파일 | 목적 | 예상 줄 수 |
|------|------|:----------:|
| `src/components/ui/skeleton.tsx` | Skeleton base 컴포넌트 | ~15 |
| `src/components/skeletons/dashboard-skeleton.tsx` | 대시보드 전체 skeleton | ~45 |
| `src/components/skeletons/board-skeleton.tsx` | 칸반 보드 skeleton | ~30 |
| `src/components/skeletons/graph-skeleton.tsx` | 그래프 페이지 skeleton | ~25 |
| `src/components/skeletons/table-skeleton.tsx` | 사용자 테이블 skeleton | ~30 |

### 2.2 수정 파일 (3개)

| 파일 | 변경 |
|------|------|
| `src/app/(dashboard)/layout.tsx` | spinner → 사이드바+헤더 포함 레이아웃 skeleton |
| `src/app/(dashboard)/board/page.tsx` | spinner → `BoardSkeleton` |
| `src/app/(dashboard)/graph/page.tsx` | spinner → `GraphSkeleton` |

## 3. 컴포넌트 상세 설계

### 3.1 Skeleton Base (`src/components/ui/skeleton.tsx`)

```tsx
// named export only
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>)

// 스타일: animate-pulse + rounded-md + bg-zinc-200 dark:bg-zinc-700
// cn()으로 className 병합
```

**API:**
- `className` — 크기/모양 커스터마이징 (h-4 w-full, rounded-full 등)
- 나머지 HTML div 속성 전달

**사용 예:**
```tsx
<Skeleton className="h-4 w-32" />          // 텍스트 한 줄
<Skeleton className="h-8 w-8 rounded-full" /> // 아바타
<Skeleton className="h-40 w-full" />        // 차트 영역
```

### 3.2 DashboardSkeleton (`src/components/skeletons/dashboard-skeleton.tsx`)

레이아웃의 인증 로딩 시 표시. 사이드바 + 헤더 + 콘텐츠 영역의 전체 레이아웃을 모방.

```
┌──────────┬─────────────────────────────────┐
│ Sidebar  │ Header                          │
│ ████████ │ ████████████████████            │
│ ████████ ├─────────────────────────────────┤
│ ████████ │ ┌──────┐┌──────┐┌──────┐┌──────┐│
│ ████████ │ │Metric││Metric││Metric││Metric ││
│          │ └──────┘└──────┘└──────┘└──────┘│
│          │ ┌──────────────┐┌──────────────┐│
│          │ │   Chart      ││   Chart      ││
│          │ └──────────────┘└──────────────┘│
│          │ ┌──────────────────────────────┐│
│          │ │   Activity Feed              ││
│          │ └──────────────────────────────┘│
└──────────┴─────────────────────────────────┘
```

**구조:**
```tsx
export function DashboardSkeleton()
  // 전체 레이아웃: min-h-screen bg-zinc-50 dark:bg-zinc-950
  // 좌측: 사이드바 skeleton (w-64, hidden lg:block)
  //   - 로고 placeholder (h-16)
  //   - nav 항목 7개 (Skeleton h-10 각각)
  // 우측: lg:pl-64
  //   - 헤더 skeleton (h-16, border-b)
  //   - 콘텐츠:
  //     - 메트릭 카드 4개 (grid sm:grid-cols-2 lg:grid-cols-4)
  //     - 차트 2개 (grid lg:grid-cols-2, h-64 각각)
  //     - 활동 피드 (Skeleton 행 4개)
```

### 3.3 BoardSkeleton (`src/components/skeletons/board-skeleton.tsx`)

보드 페이지 이슈 로딩 시 표시. 4-column 칸반 레이아웃 모방.

```
┌─────────┐┌─────────┐┌─────────┐┌─────────┐
│ Header  ││ Header  ││ Header  ││ Header  │
│ ████    ││ ████    ││ ████    ││ ████    │
│ ████    ││ ████    ││         ││ ████    │
│ ████    ││         ││         ││         │
└─────────┘└─────────┘└─────────┘└─────────┘
```

**구조:**
```tsx
export function BoardSkeleton()
  // 4-column grid (lg:grid-cols-4, gap-4)
  // 각 컬럼:
  //   - 컬럼 헤더 (Skeleton h-6 w-24)
  //   - 카드 2~4개 (Skeleton h-24, 컬럼마다 다른 수)
```

### 3.4 GraphSkeleton (`src/components/skeletons/graph-skeleton.tsx`)

그래프 페이지 데이터 로딩 시 표시. 필터 바 + 캔버스 영역 모방.

```
┌──────────────────────────────────────────┐
│ [Filter] [Filter] [Filter]    [Search]   │
├──────────────────────────────────────────┤
│                                          │
│              Canvas Area                 │
│              (h-[400px])                 │
│                                          │
└──────────────────────────────────────────┘
```

**구조:**
```tsx
export function GraphSkeleton()
  // 필터 바: flex gap-2, Skeleton 버튼 6개 (h-8 w-16~20)
  // 검색: Skeleton h-8 w-48
  // 캔버스: Skeleton rounded-lg, min-h-[400px]
```

### 3.5 TableSkeleton (`src/components/skeletons/table-skeleton.tsx`)

사용자 테이블 로딩용 (현재는 로딩 상태 없지만 향후 활용). 헤더 + 행 모방.

```
┌────────┬────────────┬──────┬──────┬────────┐
│ Name   │ Email      │ Role │Status│ Date   │
├────────┼────────────┼──────┼──────┼────────┤
│ ██████ │ ██████████ │ ███  │ ███  │ ██████ │
│ ██████ │ ██████████ │ ███  │ ███  │ ██████ │
│ ██████ │ ██████████ │ ███  │ ███  │ ██████ │
│ ██████ │ ██████████ │ ███  │ ███  │ ██████ │
│ ██████ │ ██████████ │ ███  │ ███  │ ██████ │
└────────┴────────────┴──────┴──────┴────────┘
```

**구조:**
```tsx
export function TableSkeleton({ rows = 5 }: { rows?: number })
  // Card 래퍼 (기존 Card 컴포넌트 사용)
  // thead: 5개 컬럼 헤더 (Skeleton h-4)
  // tbody: rows 개 행, 각 5개 셀 (다양한 width)
```

## 4. 수정 파일 상세

### 4.1 `(dashboard)/layout.tsx`

**Before (line 34-40):**
```tsx
if (loading) {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
```

**After:**
```tsx
if (loading) {
  return <DashboardSkeleton />;
}
```

- import 추가: `import { DashboardSkeleton } from "@/components/skeletons/dashboard-skeleton"`

### 4.2 `(dashboard)/board/page.tsx`

**Before (line 139-145):**
```tsx
if (loading) {
  return (
    <div className="flex h-64 items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
    </div>
  );
}
```

**After:**
```tsx
if (loading) {
  return <BoardSkeleton />;
}
```

- import 추가: `import { BoardSkeleton } from "@/components/skeletons/board-skeleton"`

### 4.3 `(dashboard)/graph/page.tsx`

**Before (line 134-140):**
```tsx
if (loading) {
  return (
    <div className="flex h-64 items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
    </div>
  );
}
```

**After:**
```tsx
if (loading) {
  return <GraphSkeleton />;
}
```

- import 추가: `import { GraphSkeleton } from "@/components/skeletons/graph-skeleton"`

## 5. 스타일 규칙

| 항목 | 값 |
|------|-----|
| 애니메이션 | Tailwind `animate-pulse` |
| 라이트 모드 배경 | `bg-zinc-200` |
| 다크 모드 배경 | `dark:bg-zinc-700` |
| 기본 모서리 | `rounded-md` |
| 원형 요소 | `rounded-full` |
| 유틸리티 | `cn()` from `@/lib/utils` |

## 6. 구현 순서

| 순서 | 작업 | 파일 | 의존성 |
|:----:|------|------|--------|
| 1 | Skeleton base 컴포넌트 | `ui/skeleton.tsx` | 없음 |
| 2 | DashboardSkeleton | `skeletons/dashboard-skeleton.tsx` | 순서 1 |
| 3 | BoardSkeleton | `skeletons/board-skeleton.tsx` | 순서 1 |
| 4 | GraphSkeleton | `skeletons/graph-skeleton.tsx` | 순서 1 |
| 5 | TableSkeleton | `skeletons/table-skeleton.tsx` | 순서 1 |
| 6 | layout.tsx 교체 | `(dashboard)/layout.tsx` | 순서 2 |
| 7 | board/page.tsx 교체 | `(dashboard)/board/page.tsx` | 순서 3 |
| 8 | graph/page.tsx 교체 | `(dashboard)/graph/page.tsx` | 순서 4 |

> 순서 2~5는 순서 1 이후 병렬 가능. 순서 6~8도 각각 독립적.

## 7. 검증 방법

```bash
# 빌드 확인
pnpm build

# Lint 확인
pnpm lint

# E2E 테스트 회귀 확인 (skeleton은 loading 시 짧게만 노출되므로 기존 테스트 통과해야 함)
pnpm exec playwright test
```

## 8. 성공 기준

- [ ] Skeleton base 컴포넌트 1개 생성
- [ ] 페이지별 skeleton 4개 생성 (dashboard, board, graph, table)
- [ ] 3개 파일의 spinner → skeleton 교체
- [ ] 다크모드 정상 표시
- [ ] 빌드/린트 통과
- [ ] 기존 E2E 테스트 회귀 없음
- [ ] 새 의존성 0개
