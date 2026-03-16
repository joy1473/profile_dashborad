# Design: Subtasks (서브태스크)

## Executive Summary

| Perspective | Description |
|-------------|-------------|
| **Problem** | 이슈 단위로만 작업 관리 가능 — 세부 할일 분배/개인별 추적 불가 |
| **Solution** | 서브태스크 CRUD + 담당자 지정 + "내 할일" 뷰 + 상위 이슈 컨텍스트 |
| **Function UX Effect** | 모달에서 서브태스크 체크리스트 관리, 카드에 진행률 뱃지, 내 할일 탭 |
| **Core Value** | 팀 이슈 → 개인 할일 분해로 협업 효율 향상 |

## 1. Data Model

### 1.1 SQL Migration

**File**: `supabase/migrations/006_issue_subtasks.sql`

```sql
CREATE TABLE issue_subtasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  is_done BOOLEAN NOT NULL DEFAULT false,
  assignee_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  assignee_name TEXT,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_subtasks_issue_id ON issue_subtasks(issue_id);
CREATE INDEX idx_subtasks_assignee_id ON issue_subtasks(assignee_id);

ALTER TABLE issue_subtasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read subtasks"
  ON issue_subtasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert subtasks"
  ON issue_subtasks FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update subtasks"
  ON issue_subtasks FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete subtasks"
  ON issue_subtasks FOR DELETE TO authenticated USING (true);
```

### 1.2 Type Definitions

**File**: `src/types/subtask.ts`

```typescript
export interface Subtask {
  id: string;
  issue_id: string;
  title: string;
  is_done: boolean;
  assignee_id: string | null;
  assignee_name: string | null;
  position: number;
  created_at: string;
}

export interface MySubtask extends Subtask {
  issue_title: string;
  issue_status: string;
  issue_labels: string[];
}
```

## 2. Lib Functions

**File**: `src/lib/subtasks.ts`

### 2.1 fetchSubtasks

```typescript
export async function fetchSubtasks(issueId: string): Promise<Subtask[]> {
  const { data, error } = await supabase
    .from("issue_subtasks")
    .select("*")
    .eq("issue_id", issueId)
    .order("position");
  if (error) return [];
  return data ?? [];
}
```

### 2.2 createSubtask

```typescript
export async function createSubtask(
  issueId: string,
  title: string,
  assigneeId?: string | null,
  assigneeName?: string | null,
): Promise<Subtask> {
  const { count } = await supabase
    .from("issue_subtasks")
    .select("*", { count: "exact", head: true })
    .eq("issue_id", issueId);

  const { data, error } = await supabase
    .from("issue_subtasks")
    .insert({
      issue_id: issueId,
      title,
      assignee_id: assigneeId ?? null,
      assignee_name: assigneeName ?? null,
      position: count ?? 0,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}
```

### 2.3 toggleSubtask

```typescript
export async function toggleSubtask(id: string, isDone: boolean): Promise<Subtask> {
  const { data, error } = await supabase
    .from("issue_subtasks")
    .update({ is_done: isDone })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}
```

### 2.4 deleteSubtask

```typescript
export async function deleteSubtask(id: string): Promise<void> {
  await supabase.from("issue_subtasks").delete().eq("id", id);
}
```

### 2.5 fetchMySubtasks

```typescript
export async function fetchMySubtasks(userId: string): Promise<MySubtask[]> {
  const { data, error } = await supabase
    .from("issue_subtasks")
    .select("*, issues!inner(title, status, labels)")
    .eq("assignee_id", userId)
    .order("is_done")
    .order("created_at", { ascending: false });

  if (error) return [];
  return (data ?? []).map((row) => ({
    ...row,
    issue_title: (row.issues as any).title,
    issue_status: (row.issues as any).status,
    issue_labels: (row.issues as any).labels ?? [],
  }));
}
```

### 2.6 fetchSubtaskCounts

이슈 카드 진행률 뱃지용 — 이슈 ID 배열로 한 번에 조회:

```typescript
export interface SubtaskCount {
  issue_id: string;
  total: number;
  done: number;
}

export async function fetchSubtaskCounts(issueIds: string[]): Promise<Map<string, SubtaskCount>> {
  if (issueIds.length === 0) return new Map();

  const { data, error } = await supabase
    .from("issue_subtasks")
    .select("issue_id, is_done")
    .in("issue_id", issueIds);

  if (error) return new Map();

  const counts = new Map<string, SubtaskCount>();
  for (const row of data ?? []) {
    const existing = counts.get(row.issue_id) ?? { issue_id: row.issue_id, total: 0, done: 0 };
    existing.total++;
    if (row.is_done) existing.done++;
    counts.set(row.issue_id, existing);
  }
  return counts;
}
```

## 3. Component Design

### 3.1 IssueModal — 서브태스크 섹션

**File**: `src/components/board/issue-modal.tsx` (Modified)

첨부파일 섹션 아래에 서브태스크 섹션 추가. 이슈 수정 모드(`isEdit`)에서만 표시.

**State 추가**:
```typescript
const [subtasks, setSubtasks] = useState<Subtask[]>([]);
const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
const [newSubtaskAssignee, setNewSubtaskAssignee] = useState("");
```

**useEffect**: `fetchSubtasks(issue.id)` on mount

**UI 구조**:
```
서브태스크 (2/5)
┌──────────────────────────────────────────┐
│ [입력창: 서브태스크 제목] [담당자 ▼] [추가] │
├──────────────────────────────────────────┤
│ [✓] API 엔드포인트 작성    박태준    [🗑] │
│ [ ] 테스트 코드 작성       신인숙    [🗑] │
│ [✓] 문서 업데이트          조은아    [🗑] │
└──────────────────────────────────────────┘
```

**이벤트 핸들러**:
- `handleAddSubtask()`: `createSubtask()` 호출 → state 업데이트
- `handleToggleSubtask(id, isDone)`: `toggleSubtask()` 호출 → state 업데이트
- `handleDeleteSubtask(id)`: `deleteSubtask()` 호출 → state 업데이트

### 3.2 IssueCard — 진행률 뱃지

**File**: `src/components/board/issue-card.tsx` (Modified)

**Props 추가**:
```typescript
interface IssueCardProps {
  issue: Issue;
  index: number;
  onClick: () => void;
  subtaskCount?: { total: number; done: number };  // NEW
}
```

**뱃지 UI** (담당자/마감일 옆에 추가):
```typescript
{subtaskCount && subtaskCount.total > 0 && (
  <span className="flex items-center gap-1">
    <CheckSquare size={12} />
    {subtaskCount.done}/{subtaskCount.total}
  </span>
)}
```

### 3.3 MyTasks — 내 할일 컴포넌트

**File**: `src/components/board/my-tasks.tsx` (New)

```typescript
interface MyTasksProps {
  userId: string;
  onIssueClick: (issueId: string) => void;
}
```

**동작**:
1. `fetchMySubtasks(userId)` 호출
2. 서브태스크 목록을 미완료/완료 순서로 표시
3. 각 항목: 체크박스 + 제목 + 상위 이슈 정보(제목, 상태 뱃지)
4. 상위 이슈 클릭 시 `onIssueClick(issueId)` 호출 → 해당 이슈 모달 열기
5. 체크박스 토글 시 `toggleSubtask()` 호출

**UI 구조**:
```
내 할일 (3개)
┌────────────────────────────────────────────────┐
│ [ ] API 엔드포인트 작성                         │
│     📋 로그인 기능 개발  [In Progress]           │
├────────────────────────────────────────────────┤
│ [✓] DB 스키마 설계                              │
│     📋 데이터 모델링  [Done]                     │
└────────────────────────────────────────────────┘
```

**상태 뱃지 스타일**:
```typescript
const statusBadge: Record<string, { label: string; className: string }> = {
  todo: { label: "To Do", className: "bg-zinc-100 text-zinc-600" },
  in_progress: { label: "In Progress", className: "bg-blue-100 text-blue-700" },
  in_review: { label: "In Review", className: "bg-yellow-100 text-yellow-700" },
  done: { label: "Done", className: "bg-green-100 text-green-700" },
};
```

### 3.4 Board Page — 탭 전환

**File**: `src/app/(dashboard)/board/page.tsx` (Modified)

**State 추가**:
```typescript
const [activeTab, setActiveTab] = useState<"board" | "my-tasks">("board");
const [currentUserId, setCurrentUserId] = useState<string | null>(null);
const [subtaskCounts, setSubtaskCounts] = useState<Map<string, SubtaskCount>>(new Map());
```

**useEffect 추가**: 로그인 사용자 ID 가져오기
```typescript
useEffect(() => {
  supabase.auth.getUser().then(({ data }) => {
    setCurrentUserId(data.user?.id ?? null);
  });
}, []);
```

**useEffect 추가**: 이슈 목록 변경 시 서브태스크 카운트 로드
```typescript
useEffect(() => {
  const ids = issues.map((i) => i.id);
  fetchSubtaskCounts(ids).then(setSubtaskCounts);
}, [issues]);
```

**탭 UI** (제목과 "새 이슈" 버튼 사이에 삽입):
```tsx
<div className="flex gap-1 rounded-lg bg-zinc-100 p-1 dark:bg-zinc-800">
  <button
    onClick={() => setActiveTab("board")}
    className={cn(
      "rounded-md px-3 py-1.5 text-sm font-medium",
      activeTab === "board"
        ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-50"
        : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400"
    )}
  >
    전체 보드
  </button>
  <button
    onClick={() => setActiveTab("my-tasks")}
    className={cn(
      "rounded-md px-3 py-1.5 text-sm font-medium",
      activeTab === "my-tasks"
        ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-50"
        : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400"
    )}
  >
    내 할일
  </button>
</div>
```

**조건부 렌더링**:
```tsx
{activeTab === "board" ? (
  <>
    <IssueFilters ... />
    <KanbanBoard ... />
  </>
) : (
  currentUserId && (
    <MyTasks
      userId={currentUserId}
      onIssueClick={(issueId) => {
        const issue = issues.find((i) => i.id === issueId);
        if (issue) handleCardClick(issue);
      }}
    />
  )
)}
```

**IssueCard에 subtaskCount 전달**: `KanbanBoard` → `KanbanColumn` → `IssueCard`로 전달.

## 4. Data Flow

```
┌─────────────────────────────────────────────────────────┐
│  Supabase: issue_subtasks                               │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐          │
│  │ subtask1 │    │ subtask2 │    │ subtask3 │          │
│  │ issue_id │    │ issue_id │    │ issue_id │          │
│  │assign:박 │    │assign:신 │    │assign:조 │          │
│  └──────────┘    └──────────┘    └──────────┘          │
└──────────────────┬──────────────────────────────────────┘
                   │
    ┌──────────────┼──────────────────────┐
    ▼              ▼                      ▼
┌──────────┐  ┌──────────┐  ┌──────────────────┐
│IssueModal│  │IssueCard │  │   MyTasks        │
│ CRUD UI  │  │ 뱃지 2/5 │  │ 내 할일 리스트   │
│ 체크리스트│  │          │  │ + 상위이슈 정보  │
└──────────┘  └──────────┘  └──────────────────┘
```

## 5. Affected Files

| File | Change | Description |
|------|--------|-------------|
| `supabase/migrations/006_issue_subtasks.sql` | **New** | 테이블 + 인덱스 + RLS |
| `src/types/subtask.ts` | **New** | Subtask, MySubtask, SubtaskCount 타입 |
| `src/lib/subtasks.ts` | **New** | CRUD + fetchMySubtasks + fetchSubtaskCounts |
| `src/components/board/issue-modal.tsx` | **Modified** | 서브태스크 섹션 (추가/체크/삭제/담당자) |
| `src/components/board/issue-card.tsx` | **Modified** | 진행률 뱃지 (`done/total`) |
| `src/components/board/kanban-column.tsx` | **Modified** | subtaskCounts prop 전달 |
| `src/components/board/kanban-board.tsx` | **Modified** | subtaskCounts prop 전달 |
| `src/components/board/my-tasks.tsx` | **New** | 내 할일 컴포넌트 |
| `src/app/(dashboard)/board/page.tsx` | **Modified** | 탭 전환 + currentUserId + subtaskCounts |

## 6. Implementation Order

| # | Task | File(s) | Dependency |
|---|------|---------|------------|
| 1 | SQL 마이그레이션 작성 | `006_issue_subtasks.sql` | None |
| 2 | 타입 정의 | `subtask.ts` | None |
| 3 | Lib CRUD 함수 | `subtasks.ts` | Step 2 |
| 4 | IssueModal 서브태스크 섹션 | `issue-modal.tsx` | Step 3 |
| 5 | IssueCard 진행률 뱃지 | `issue-card.tsx`, `kanban-column.tsx`, `kanban-board.tsx` | Step 3 |
| 6 | MyTasks 컴포넌트 | `my-tasks.tsx` | Step 3 |
| 7 | Board 페이지 탭 전환 + 통합 | `board/page.tsx` | Steps 4-6 |

## 7. Edge Cases

| Case | Handling |
|------|----------|
| 이슈 삭제 시 서브태스크 | `ON DELETE CASCADE` — 자동 삭제 |
| 담당자 미지정 서브태스크 | assignee_id = null, "내 할일"에 미표시 |
| 서브태스크 0개인 이슈 | IssueCard 뱃지 미표시, 모달에 "서브태스크가 없습니다" |
| 로그인 안 한 상태 | "내 할일" 탭에서 "로그인이 필요합니다" 표시 |
| 서브태스크 대량 추가 | position 자동 증가, 스크롤 가능 영역 |

## 8. Testing Checklist

| # | Scenario | Expected |
|---|----------|----------|
| T1 | 이슈 모달에서 서브태스크 추가 | 제목 + 담당자 지정하여 추가, 목록에 표시 |
| T2 | 서브태스크 체크/언체크 | is_done 토글, 즉시 반영 |
| T3 | 서브태스크 삭제 | 목록에서 제거 |
| T4 | IssueCard 진행률 뱃지 | `2/5` 형식으로 표시, 서브태스크 없으면 미표시 |
| T5 | "내 할일" 탭 | 로그인 사용자의 서브태스크만 표시 |
| T6 | 내 할일에서 상위 이슈 클릭 | 해당 이슈 모달 열기 |
| T7 | 이슈 삭제 | 서브태스크도 CASCADE 삭제 |
