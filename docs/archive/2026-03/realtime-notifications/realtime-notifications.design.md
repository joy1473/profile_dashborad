# Design: Realtime Notifications

## Executive Summary

| Perspective | Description |
|-------------|-------------|
| **Problem** | 이슈 변경 시 다른 사용자에게 즉시 반영되지 않아 수동 새로고침 필요 |
| **Solution** | Supabase Realtime `postgres_changes` 구독 + Toast 알림 + Board/Dashboard 자동 갱신 |
| **Function UX Effect** | 이슈 변경 시 Toast 알림 표시 + Board/Dashboard 실시간 자동 갱신 |
| **Core Value** | 새로고침 없이 팀원의 작업을 즉시 확인 가능한 실시간 협업 경험 |

## 1. Component Design

### 1.1 `useRealtimeIssues` Hook

**File**: `src/hooks/use-realtime-issues.ts`

커스텀 훅으로 Supabase Realtime 채널 구독을 캡슐화.

```typescript
import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import type { Issue } from "@/types/issue";

type RealtimeEventType = "INSERT" | "UPDATE" | "DELETE";

interface RealtimeIssueEvent {
  eventType: RealtimeEventType;
  new: Issue | null;   // INSERT/UPDATE 시 새 레코드
  old: { id: string }; // UPDATE/DELETE 시 이전 레코드 (id만 보장)
}

type RealtimeIssueCallback = (event: RealtimeIssueEvent) => void;

export function useRealtimeIssues(onEvent: RealtimeIssueCallback): void;
```

**동작 흐름**:

1. `useEffect` 내에서 Supabase 채널 생성
2. `postgres_changes` 이벤트(`*`) 구독 — `schema: "public"`, `table: "issues"`
3. 이벤트 수신 시 `onEvent` 콜백 호출
4. 컴포넌트 언마운트 시 `supabase.removeChannel(channel)` 정리

**구현 상세**:

```typescript
export function useRealtimeIssues(onEvent: RealtimeIssueCallback) {
  useEffect(() => {
    const channel = supabase
      .channel("issues-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "issues" },
        (payload) => {
          onEvent({
            eventType: payload.eventType as RealtimeEventType,
            new: payload.new as Issue | null,
            old: payload.old as { id: string },
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [onEvent]);
}
```

**주의사항**:
- `onEvent`는 호출 측에서 `useCallback`으로 안정화해야 함 (무한 재구독 방지)
- USE_MOCK 환경에서는 구독 자체가 실패해도 에러 없이 무시됨 (Supabase URL 없으면 채널 비활성)

### 1.2 Toast 메시지 헬퍼

**File**: `src/hooks/use-realtime-issues.ts` (같은 파일 내 export)

```typescript
export function getRealtimeToastMessage(event: RealtimeIssueEvent): string {
  switch (event.eventType) {
    case "INSERT":
      return `새 이슈가 생성되었습니다: ${event.new?.title ?? ""}`;
    case "UPDATE":
      return `이슈가 수정되었습니다: ${event.new?.title ?? ""}`;
    case "DELETE":
      return "이슈가 삭제되었습니다";
  }
}
```

## 2. Page Modifications

### 2.1 Board Page (`src/app/(dashboard)/board/page.tsx`)

**변경 사항**:

1. `useRealtimeIssues` + `getRealtimeToastMessage` import 추가
2. Realtime 이벤트 콜백에서:
   - **INSERT**: `setIssues(prev => [...prev, event.new])`
   - **UPDATE**: `setIssues(prev => prev.map(i => i.id === event.new.id ? event.new : i))`
   - **DELETE**: `setIssues(prev => prev.filter(i => i.id !== event.old.id))`
   - 모든 이벤트: `showToast(getRealtimeToastMessage(event), "success")`

**콜백 구현**:

```typescript
const handleRealtimeEvent = useCallback(
  (event: RealtimeIssueEvent) => {
    switch (event.eventType) {
      case "INSERT":
        if (event.new) setIssues((prev) => [...prev, event.new as Issue]);
        break;
      case "UPDATE":
        if (event.new)
          setIssues((prev) =>
            prev.map((i) => (i.id === (event.new as Issue).id ? (event.new as Issue) : i))
          );
        break;
      case "DELETE":
        setIssues((prev) => prev.filter((i) => i.id !== event.old.id));
        break;
    }
    showToast(getRealtimeToastMessage(event), "success");
  },
  [showToast]
);

useRealtimeIssues(handleRealtimeEvent);
```

**Optimistic Update 충돌 처리**:
- 본인의 CRUD 액션은 이미 optimistic update로 반영되어 있음
- Realtime 이벤트로 같은 데이터가 오면 덮어씀 (최종 일관성 보장, 사이드이펙트 없음)
- INSERT 중복 방지: `setIssues` 내에서 `prev.some(i => i.id === event.new.id)` 체크 추가

```typescript
case "INSERT":
  if (event.new)
    setIssues((prev) =>
      prev.some((i) => i.id === (event.new as Issue).id)
        ? prev
        : [...prev, event.new as Issue]
    );
  break;
```

### 2.2 Dashboard Page (`src/app/(dashboard)/dashboard/page.tsx`)

**변경 사항**:

1. `useRealtimeIssues` import 추가
2. Realtime 이벤트 수신 시 활동 로그 재로드: `fetchActivities(5).then(setActivitiesData)`
3. Toast 알림은 Board 전용 — Dashboard에서는 활동 로그 갱신만 수행

**콜백 구현**:

```typescript
const handleRealtimeEvent = useCallback(() => {
  fetchActivities(5).then(setActivitiesData);
}, []);

useRealtimeIssues(handleRealtimeEvent);
```

## 3. Data Flow

```
┌──────────────────────────────────────────────────────────┐
│  Supabase PostgreSQL                                     │
│  ┌────────────────┐                                      │
│  │  issues 테이블  │ ── INSERT/UPDATE/DELETE ──┐          │
│  └────────────────┘                           │          │
│                                               ▼          │
│  ┌─────────────────────────────────────────────────────┐ │
│  │  Supabase Realtime (WebSocket)                      │ │
│  │  Publication: supabase_realtime                      │ │
│  └──────────────────────┬──────────────────────────────┘ │
└─────────────────────────┼────────────────────────────────┘
                          │ postgres_changes event
                          ▼
┌─────────────────────────────────────────────────────────┐
│  Browser (Client)                                       │
│                                                         │
│  useRealtimeIssues(onEvent)                             │
│       │                                                 │
│       ├──→ Board Page                                   │
│       │    ├── setIssues() → 보드 자동 갱신              │
│       │    └── showToast() → 알림 표시                   │
│       │                                                 │
│       └──→ Dashboard Page                               │
│            └── fetchActivities() → 활동 로그 갱신        │
└─────────────────────────────────────────────────────────┘
```

## 4. Affected Files

| File | Change | Description |
|------|--------|-------------|
| `src/hooks/use-realtime-issues.ts` | **New** | Realtime 구독 훅 + Toast 메시지 헬퍼 |
| `src/app/(dashboard)/board/page.tsx` | **Modified** | 훅 연결, INSERT/UPDATE/DELETE 처리, Toast 알림 |
| `src/app/(dashboard)/dashboard/page.tsx` | **Modified** | 훅 연결, 활동 로그 자동 갱신 |

## 5. Implementation Order

| # | Task | File | Dependency |
|---|------|------|------------|
| 1 | `useRealtimeIssues` 훅 + `getRealtimeToastMessage` 작성 | `use-realtime-issues.ts` | None |
| 2 | Board 페이지에 훅 연결 + 이벤트 핸들러 추가 | `board/page.tsx` | Step 1 |
| 3 | Dashboard 페이지에 훅 연결 + 활동 로그 갱신 | `dashboard/page.tsx` | Step 1 |

## 6. Edge Cases

| Case | Handling |
|------|----------|
| 본인 액션 중복 (optimistic + realtime) | INSERT: `prev.some()` 중복 체크. UPDATE: 덮어쓰기 (무해). DELETE: 이미 제거된 id 무시. |
| WebSocket 연결 끊김 | Supabase SDK 자동 재연결. 재연결 시 마지막 상태부터 이벤트 수신. |
| Mock 환경 (Supabase URL 없음) | 채널 구독 자체가 비활성 — 에러 없이 무시됨 |
| 빠른 연속 이벤트 | Toast 4초 자동 소멸 (기존 구현). 여러 Toast 스택 표시. |
| 페이지 전환 시 | `useEffect` cleanup에서 `removeChannel()` 호출 — 메모리 누수 없음 |

## 7. Prerequisites

- [x] `issues` 테이블 존재 (Supabase)
- [x] Realtime publication 활성화: `ALTER PUBLICATION supabase_realtime ADD TABLE issues;`
- [x] `@supabase/supabase-js` 설치됨 (기존)
- [x] Toast 시스템 구현됨 (`useToast`, `showToast`)

## 8. Testing Checklist

| # | Scenario | Expected |
|---|----------|----------|
| T1 | 다른 탭에서 이슈 생성 | Board에 새 이슈 추가 + Toast "새 이슈가 생성되었습니다: {title}" |
| T2 | 다른 탭에서 이슈 수정 | Board 해당 이슈 갱신 + Toast "이슈가 수정되었습니다: {title}" |
| T3 | 다른 탭에서 이슈 삭제 | Board에서 이슈 제거 + Toast "이슈가 삭제되었습니다" |
| T4 | 같은 탭에서 이슈 생성 | Optimistic update + Realtime → 중복 없이 1개만 표시 |
| T5 | Dashboard에서 이슈 변경 감지 | 활동 로그 자동 갱신 |
| T6 | Board 페이지 떠난 후 | Channel unsubscribe 정상 동작 (콘솔 에러 없음) |
