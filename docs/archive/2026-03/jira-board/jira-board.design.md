# jira-board Design Document

> **Summary**: JIRA-like 칸반 보드 및 이슈 트래킹 — Supabase 스키마 + 컴포넌트 상세 설계
>
> **Project**: saas-dashboard
> **Version**: 0.1.0
> **Author**: EUNA
> **Date**: 2026-03-15
> **Status**: Draft
> **Planning Doc**: [jira-board.plan.md](../../01-plan/features/jira-board.plan.md)

### Pipeline References

| Phase | Document | Status |
|-------|----------|--------|
| Phase 1 | Schema Definition | N/A |
| Phase 2 | Coding Conventions | N/A |
| Phase 3 | Mockup | N/A |
| Phase 4 | API Spec | Inline (this doc) |

---

## 1. Overview

### 1.1 Design Goals

- 기존 SaaS Dashboard UI 패턴(Card, Sidebar, dark mode)과 일관된 칸반 보드 구현
- Supabase RLS를 활용한 사용자별 이슈 격리
- 드래그앤드롭으로 직관적인 이슈 상태 관리
- 최소 의존성 추가 (DnD 라이브러리 1개만 추가)

### 1.2 Design Principles

- **기존 패턴 준수**: `cn()` 유틸, Card 컴포넌트, Zustand 스토어 패턴 재사용
- **점진적 확장**: Mock 데이터로 시작 → Supabase 연동 → 실시간 업데이트(v2)
- **컴포넌트 분리**: 보드/컬럼/카드/모달을 독립적 컴포넌트로 분리

---

## 2. Architecture

### 2.1 Component Diagram

```
┌──────────────────────────────────────────────────────────────┐
│  /board (Page)                                               │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  IssueFilters (필터 바: 우선순위, 담당자, 검색)          │  │
│  ├────────────────────────────────────────────────────────┤  │
│  │  KanbanBoard (DragDropContext)                         │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │  │
│  │  │  Column   │ │  Column   │ │  Column   │ │  Column   │ │  │
│  │  │  To Do    │ │  In Prog  │ │  Review   │ │  Done     │ │  │
│  │  │ ┌──────┐ │ │ ┌──────┐ │ │ ┌──────┐ │ │ ┌──────┐ │ │  │
│  │  │ │Card  │ │ │ │Card  │ │ │ │Card  │ │ │ │Card  │ │ │  │
│  │  │ └──────┘ │ │ └──────┘ │ │ └──────┘ │ │ └──────┘ │ │  │
│  │  │ ┌──────┐ │ │          │ │          │ │          │ │  │
│  │  │ │Card  │ │ │          │ │          │ │          │ │  │
│  │  │ └──────┘ │ │          │ │          │ │          │ │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ │  │
│  └────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  IssueModal (생성/편집 — 오버레이)                       │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

### 2.2 Data Flow

```
User Action (drag/create/edit/delete)
  → Component Event Handler
    → lib/issues.ts (Supabase CRUD)
      → Supabase DB (issues table)
        → Response
          → Zustand Store (board-store) or local state update
            → UI Re-render
```

### 2.3 Dependencies

| Component | Depends On | Purpose |
|-----------|-----------|---------|
| KanbanBoard | @hello-pangea/dnd | 드래그앤드롭 컨텍스트 |
| KanbanBoard | board-store (Zustand) | 이슈 상태 관리 |
| IssueCard | types/issue.ts | 이슈 데이터 타입 |
| IssueModal | lib/issues.ts | Supabase CRUD 호출 |
| lib/issues.ts | lib/supabase.ts | Supabase 클라이언트 |

**New dependency to install:**
```bash
pnpm add @hello-pangea/dnd
pnpm add -D @types/react-beautiful-dnd  # @hello-pangea/dnd includes types, check first
```

> Fallback: `@hello-pangea/dnd`가 React 19와 호환되지 않을 경우 `@dnd-kit/core @dnd-kit/sortable` 사용

---

## 3. Data Model

### 3.1 Entity Definition

```typescript
// src/types/issue.ts

export type IssueStatus = "todo" | "in_progress" | "in_review" | "done";
export type IssuePriority = "high" | "medium" | "low";

export interface Issue {
  id: string;
  title: string;
  description: string;
  status: IssueStatus;
  priority: IssuePriority;
  assignee_id: string | null;
  assignee_name: string | null;
  labels: string[];
  due_date: string | null;       // ISO 8601
  position: number;               // 컬럼 내 정렬 순서
  user_id: string;                // 생성자 (RLS 기준)
  created_at: string;
  updated_at: string;
}

export interface IssueColumn {
  id: IssueStatus;
  title: string;
  issues: Issue[];
}

export interface CreateIssueInput {
  title: string;
  description?: string;
  status?: IssueStatus;
  priority: IssuePriority;
  assignee_id?: string | null;
  labels?: string[];
  due_date?: string | null;
}

export interface UpdateIssueInput extends Partial<CreateIssueInput> {
  position?: number;
}
```

### 3.2 Entity Relationships

```
[auth.users] 1 ──── N [issues]       (user_id → auth.users.id)
[auth.users] 1 ──── N [issues]       (assignee_id → auth.users.id, nullable)
```

### 3.3 Database Schema (Supabase PostgreSQL)

```sql
-- issues 테이블
CREATE TABLE public.issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'todo'
    CHECK (status IN ('todo', 'in_progress', 'in_review', 'done')),
  priority TEXT NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('high', 'medium', 'low')),
  assignee_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assignee_name TEXT,
  labels TEXT[] DEFAULT '{}',
  due_date TIMESTAMPTZ,
  position INTEGER NOT NULL DEFAULT 0,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 정렬을 위한 인덱스
CREATE INDEX idx_issues_status_position ON public.issues(status, position);
CREATE INDEX idx_issues_user_id ON public.issues(user_id);

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER issues_updated_at
  BEFORE UPDATE ON public.issues
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS 정책
ALTER TABLE public.issues ENABLE ROW LEVEL SECURITY;

-- 본인 이슈만 조회
CREATE POLICY "Users can view own issues"
  ON public.issues FOR SELECT
  USING (auth.uid() = user_id);

-- 본인만 이슈 생성 (user_id 자동 설정)
CREATE POLICY "Users can create own issues"
  ON public.issues FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 본인 이슈만 수정
CREATE POLICY "Users can update own issues"
  ON public.issues FOR UPDATE
  USING (auth.uid() = user_id);

-- 본인 이슈만 삭제
CREATE POLICY "Users can delete own issues"
  ON public.issues FOR DELETE
  USING (auth.uid() = user_id);
```

---

## 4. API Specification

### 4.1 Supabase Client Functions (`src/lib/issues.ts`)

Supabase JS Client를 직접 사용하므로 별도 REST API 엔드포인트 불필요.

| Function | Description | Returns |
|----------|-------------|---------|
| `fetchIssues()` | 현재 사용자의 모든 이슈 조회 (status, position 정렬) | `Issue[]` |
| `createIssue(input)` | 새 이슈 생성 | `Issue` |
| `updateIssue(id, input)` | 이슈 수정 (상태/위치/내용) | `Issue` |
| `deleteIssue(id)` | 이슈 삭제 | `void` |
| `moveIssue(id, status, position)` | 이슈 상태 변경 + 위치 업데이트 | `Issue` |
| `reorderIssues(updates)` | 배치 위치 업데이트 (같은 컬럼 내 정렬) | `void` |

### 4.2 Function Signatures

```typescript
// src/lib/issues.ts
import { supabase } from "./supabase";
import type { Issue, CreateIssueInput, UpdateIssueInput } from "@/types/issue";

export async function fetchIssues(): Promise<Issue[]> {
  const { data, error } = await supabase
    .from("issues")
    .select("*")
    .order("status")
    .order("position");
  if (error) throw error;
  return data;
}

export async function createIssue(input: CreateIssueInput): Promise<Issue> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // position: 해당 status 컬럼의 마지막 위치 + 1
  const { count } = await supabase
    .from("issues")
    .select("*", { count: "exact", head: true })
    .eq("status", input.status ?? "todo");

  const { data, error } = await supabase
    .from("issues")
    .insert({
      ...input,
      status: input.status ?? "todo",
      position: count ?? 0,
      user_id: user.id,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateIssue(id: string, input: UpdateIssueInput): Promise<Issue> {
  const { data, error } = await supabase
    .from("issues")
    .update(input)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteIssue(id: string): Promise<void> {
  const { error } = await supabase.from("issues").delete().eq("id", id);
  if (error) throw error;
}

export async function moveIssue(
  id: string,
  status: IssueStatus,
  position: number
): Promise<Issue> {
  return updateIssue(id, { status, position });
}
```

---

## 5. UI/UX Design

### 5.1 Screen Layout — `/board` 페이지

```
┌─────────────────────────────────────────────────────────────────┐
│ [Sidebar]  │  [Header]                                          │
│            │─────────────────────────────────────────────────────│
│  대시보드    │  보드                                  [+ 새 이슈]  │
│  분석       │─────────────────────────────────────────────────────│
│  사용자     │  [필터: 우선순위 ▼] [담당자 ▼] [🔍 검색...]         │
│  QR 명함    │─────────────────────────────────────────────────────│
│ ★보드       │  ┌─────────┐ ┌──────────┐ ┌─────────┐ ┌─────────┐ │
│  설정       │  │ To Do   │ │In Progr. │ │ Review  │ │  Done   │ │
│            │  │ (3)     │ │ (1)      │ │ (0)     │ │ (2)     │ │
│            │  │┌───────┐│ │┌────────┐│ │         │ │┌───────┐│ │
│            │  ││🔴 High ││ ││🟡 Med  ││ │         │ ││🟢 Low ││ │
│            │  ││Title  ││ ││Title   ││ │         │ ││Title  ││ │
│            │  ││@김민수 ││ ││@이지은  ││ │         │ ││@최유리 ││ │
│            │  ││📅 3/20││ ││📅 3/18 ││ │         │ ││✅     ││ │
│            │  │└───────┘│ │└────────┘│ │         │ │└───────┘│ │
│            │  │┌───────┐│ │          │ │         │ │┌───────┐│ │
│            │  ││🟡 Med ││ │          │ │         │ ││🟢 Low ││ │
│            │  ││Title  ││ │          │ │         │ ││Title  ││ │
│            │  │└───────┘│ │          │ │         │ │└───────┘│ │
│            │  └─────────┘ └──────────┘ └─────────┘ └─────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 User Flow

```
Board 페이지 로드
  → fetchIssues() → 컬럼별 이슈 분류 → 보드 렌더링
  │
  ├─ [+ 새 이슈] 클릭 → IssueModal(생성 모드) → createIssue() → 보드 갱신
  ├─ 카드 클릭 → IssueModal(편집 모드) → updateIssue() → 보드 갱신
  ├─ 카드 드래그 → moveIssue() → 보드 갱신 (낙관적 업데이트)
  └─ 카드 삭제 → 확인 다이얼로그 → deleteIssue() → 보드 갱신
```

### 5.3 Component List

| Component | Location | Responsibility |
|-----------|----------|----------------|
| `BoardPage` | `src/app/(dashboard)/board/page.tsx` | 보드 페이지 진입점, 데이터 fetch |
| `KanbanBoard` | `src/components/board/kanban-board.tsx` | DragDropContext, 컬럼 렌더링 |
| `KanbanColumn` | `src/components/board/kanban-column.tsx` | Droppable 영역, 이슈 카드 리스트 |
| `IssueCard` | `src/components/board/issue-card.tsx` | Draggable 이슈 카드 (우선순위 색상, 담당자, 마감일) |
| `IssueModal` | `src/components/board/issue-modal.tsx` | 이슈 생성/편집 폼 모달 |
| `IssueFilters` | `src/components/board/issue-filters.tsx` | 우선순위/담당자 필터, 검색 |
| `ToastProvider` | `src/components/ui/toast.tsx` | Toast 알림 (에러/성공 피드백) |

> **Note**: `DeleteConfirm`은 별도 컴포넌트 대신 `IssueModal` 내 인라인 확인 UI로 구현 (v1 간소화).
> 담당자 필드는 드롭다운 대신 텍스트 입력으로 구현 (v1).

### 5.4 IssueCard 상세 디자인

```
┌─────────────────────────────┐
│ 🔴  [bug] [frontend]        │  ← 우선순위 아이콘 + 라벨 태그
│                             │
│ 로그인 페이지 오류 수정       │  ← 제목 (font-medium)
│                             │
│ 👤 김민수    📅 2026-03-20   │  ← 담당자 + 마감일
└─────────────────────────────┘

우선순위 색상:
- High: 🔴 border-l-4 border-red-500
- Medium: 🟡 border-l-4 border-yellow-500
- Low: 🟢 border-l-4 border-green-500
```

### 5.5 IssueModal 상세 디자인

```
┌──────────────────────────────────────┐
│  새 이슈 생성          [✕]            │
│──────────────────────────────────────│
│  제목 *                              │
│  ┌──────────────────────────────┐    │
│  │                              │    │
│  └──────────────────────────────┘    │
│                                      │
│  설명                                │
│  ┌──────────────────────────────┐    │
│  │                              │    │
│  │                              │    │
│  └──────────────────────────────┘    │
│                                      │
│  ┌──────────┐  ┌──────────┐          │
│  │ 우선순위 ▼│  │ 상태   ▼ │          │
│  └──────────┘  └──────────┘          │
│                                      │
│  ┌──────────┐  ┌──────────┐          │
│  │ 담당자  ▼ │  │ 마감일 📅│          │
│  └──────────┘  └──────────┘          │
│                                      │
│  라벨 (쉼표로 구분)                    │
│  ┌──────────────────────────────┐    │
│  │ bug, frontend                │    │
│  └──────────────────────────────┘    │
│                                      │
│  [취소]                    [저장]     │
└──────────────────────────────────────┘
```

---

## 6. Error Handling

### 6.1 Error Scenarios

| Code | Message | Cause | Handling |
|------|---------|-------|----------|
| AUTH | 로그인이 필요합니다 | 세션 만료/미인증 | /login 리다이렉트 (기존 layout 처리) |
| FETCH | 이슈를 불러올 수 없습니다 | 네트워크/Supabase 오류 | 에러 메시지 + 재시도 버튼 |
| CREATE | 이슈 생성에 실패했습니다 | DB insert 실패 | toast 알림 |
| UPDATE | 이슈 수정에 실패했습니다 | DB update 실패 | 낙관적 업데이트 롤백 + toast |
| DELETE | 이슈 삭제에 실패했습니다 | DB delete 실패 | toast 알림 |
| DRAG | 이동에 실패했습니다 | moveIssue 실패 | 원위치 롤백 + toast |

### 6.2 Error Handling Pattern

```typescript
// 낙관적 업데이트 패턴 (드래그앤드롭)
try {
  // 1. UI 즉시 업데이트 (낙관적)
  optimisticUpdate(issueId, newStatus, newPosition);
  // 2. 서버 요청
  await moveIssue(issueId, newStatus, newPosition);
} catch (error) {
  // 3. 실패 시 롤백
  rollbackUpdate(issueId, originalStatus, originalPosition);
  showToast("이동에 실패했습니다");
}
```

---

## 7. Security Considerations

- [x] **RLS 정책**: `user_id = auth.uid()` 기반 — 본인 이슈만 CRUD 가능
- [x] **입력 검증**: title 필수, status/priority는 enum CHECK 제약
- [x] **XSS 방지**: React 기본 이스케이프 + Tailwind (인라인 HTML 없음)
- [x] **인증 필수**: `(dashboard)` route group layout에서 세션 체크 기존 적용
- [ ] **Rate Limiting**: Supabase 기본 rate limit 사용 (커스텀 불필요)

---

## 8. Test Plan

### 8.1 Test Scope

| Type | Target | Tool |
|------|--------|------|
| E2E Test | 보드 페이지 핵심 플로우 | Playwright |

### 8.2 Test Cases (Key)

- [ ] 보드 페이지 로드 시 4개 컬럼 표시
- [ ] 새 이슈 생성 → 해당 컬럼에 카드 표시
- [ ] 이슈 카드 클릭 → 편집 모달 표시
- [ ] 이슈 삭제 → 확인 후 카드 제거
- [ ] 우선순위 필터 적용 시 필터된 결과만 표시

> 드래그앤드롭 E2E 테스트는 Playwright의 `page.mouse` API로 구현

---

## 9. Clean Architecture

### 9.1 Layer Structure (Dynamic Level)

| Layer | Responsibility | Location |
|-------|---------------|----------|
| **Presentation** | 보드 UI, 모달, 카드 컴포넌트 | `src/components/board/`, `src/app/(dashboard)/board/` |
| **Application** | 이슈 상태 관리, 필터 로직 | `BoardPage` 내 `useState` (v1 — 별도 store 불필요한 규모) |
| **Domain** | Issue 타입, 상태 enum | `src/types/issue.ts` |
| **Infrastructure** | Supabase CRUD 함수 | `src/lib/issues.ts` |

### 9.2 This Feature's Layer Assignment

| Component | Layer | Location |
|-----------|-------|----------|
| BoardPage | Presentation | `src/app/(dashboard)/board/page.tsx` |
| KanbanBoard | Presentation | `src/components/board/kanban-board.tsx` |
| KanbanColumn | Presentation | `src/components/board/kanban-column.tsx` |
| IssueCard | Presentation | `src/components/board/issue-card.tsx` |
| IssueModal | Presentation | `src/components/board/issue-modal.tsx` |
| IssueFilters | Presentation | `src/components/board/issue-filters.tsx` |
| BoardPage state | Application | `src/app/(dashboard)/board/page.tsx` (useState) |
| ToastProvider | Presentation | `src/components/ui/toast.tsx` |
| Issue types | Domain | `src/types/issue.ts` |
| issues CRUD | Infrastructure | `src/lib/issues.ts` |

---

## 10. Coding Convention Reference

### 10.1 This Feature's Conventions

| Item | Convention Applied |
|------|-------------------|
| Component naming | PascalCase: `KanbanBoard`, `IssueCard`, `IssueModal` |
| File naming | kebab-case: `kanban-board.tsx`, `issue-card.tsx` |
| Folder structure | `src/components/board/` — 보드 관련 컴포넌트 그룹 |
| State management | React `useState` in BoardPage — 단일 페이지 스코프로 충분, v2에서 Zustand 검토 |
| Styling | Tailwind + `cn()` 유틸 — 기존 패턴 유지 |
| Data fetching | Supabase client 직접 호출 (`lib/issues.ts`) |
| Error handling | try/catch + toast (낙관적 업데이트 시 롤백) |

---

## 11. Implementation Guide

### 11.1 File Structure

```
src/
├── app/(dashboard)/board/
│   └── page.tsx                      # [1] 보드 페이지
├── components/board/
│   ├── kanban-board.tsx              # [3] DnD 보드 컨테이너
│   ├── kanban-column.tsx             # [4] 드롭 가능 컬럼
│   ├── issue-card.tsx                # [5] 드래그 가능 카드
│   ├── issue-modal.tsx               # [6] 생성/편집 모달
│   └── issue-filters.tsx             # [7] 필터 바 (우선순위 + 담당자 + 검색)
├── components/ui/
│   └── toast.tsx                     # Toast 알림 시스템
├── lib/
│   ├── issues.ts                     # [2] Supabase CRUD + mock fallback
│   └── mock-issues.ts               # Mock 데이터 (Supabase 미설정 시)
├── types/
│   └── issue.ts                      # [1] 타입 정의
```

### 11.2 Implementation Order

1. [ ] **타입 정의** — `src/types/issue.ts` (Issue, IssueStatus, IssuePriority)
2. [ ] **Supabase 스키마** — SQL 실행 (issues 테이블 + RLS + 인덱스)
3. [ ] **CRUD 함수** — `src/lib/issues.ts` (fetchIssues, createIssue, updateIssue, deleteIssue, moveIssue)
4. [ ] **DnD 라이브러리 설치** — `pnpm add @hello-pangea/dnd`
5. [ ] **사이드바 내비게이션 추가** — sidebar.tsx에 "보드" 메뉴 항목 추가
6. [ ] **보드 페이지** — `src/app/(dashboard)/board/page.tsx`
7. [ ] **KanbanBoard** — DragDropContext + 컬럼 렌더링
8. [ ] **KanbanColumn** — Droppable + 카드 리스트
9. [ ] **IssueCard** — Draggable + 우선순위 색상 + 담당자/마감일
10. [ ] **IssueModal** — 생성/편집 폼 (제목, 설명, 우선순위, 담당자, 마감일, 라벨)
11. [ ] **IssueFilters** — 우선순위/담당자 드롭다운 + 검색
12. [ ] **DeleteConfirm** — 삭제 확인 다이얼로그
13. [ ] **E2E 테스트** — `e2e/board.spec.ts`

### 11.3 Mock Data (Supabase 연동 전 개발용)

```typescript
// src/lib/mock-issues.ts
import type { Issue } from "@/types/issue";

export const mockIssues: Issue[] = [
  {
    id: "1",
    title: "로그인 페이지 오류 수정",
    description: "카카오 로그인 후 리다이렉트 실패 건",
    status: "todo",
    priority: "high",
    assignee_id: "1",
    assignee_name: "김민수",
    labels: ["bug", "auth"],
    due_date: "2026-03-20",
    position: 0,
    user_id: "current-user",
    created_at: "2026-03-10T09:00:00Z",
    updated_at: "2026-03-10T09:00:00Z",
  },
  {
    id: "2",
    title: "대시보드 차트 반응형 개선",
    description: "모바일에서 차트가 잘리는 이슈",
    status: "in_progress",
    priority: "medium",
    assignee_id: "2",
    assignee_name: "이지은",
    labels: ["ui", "responsive"],
    due_date: "2026-03-18",
    position: 0,
    user_id: "current-user",
    created_at: "2026-03-08T14:00:00Z",
    updated_at: "2026-03-12T10:00:00Z",
  },
  {
    id: "3",
    title: "QR 명함 공유 기능",
    description: "SNS 공유 버튼 추가",
    status: "todo",
    priority: "medium",
    assignee_id: null,
    assignee_name: null,
    labels: ["feature"],
    due_date: null,
    position: 1,
    user_id: "current-user",
    created_at: "2026-03-11T11:00:00Z",
    updated_at: "2026-03-11T11:00:00Z",
  },
  {
    id: "4",
    title: "사용자 목록 페이지네이션",
    description: "",
    status: "done",
    priority: "low",
    assignee_id: "4",
    assignee_name: "최유리",
    labels: ["enhancement"],
    due_date: "2026-03-15",
    position: 0,
    user_id: "current-user",
    created_at: "2026-03-05T08:00:00Z",
    updated_at: "2026-03-14T16:00:00Z",
  },
  {
    id: "5",
    title: "다크모드 색상 통일",
    description: "일부 페이지에서 다크모드 색상이 불일치",
    status: "done",
    priority: "low",
    assignee_id: "1",
    assignee_name: "김민수",
    labels: ["ui", "darkmode"],
    due_date: "2026-03-12",
    position: 1,
    user_id: "current-user",
    created_at: "2026-03-06T10:00:00Z",
    updated_at: "2026-03-11T15:00:00Z",
  },
];
```

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-15 | Initial draft — Supabase schema, component design, implementation order | EUNA |
