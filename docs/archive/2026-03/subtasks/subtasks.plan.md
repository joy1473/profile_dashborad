# Plan: Subtasks (서브태스크)

## Executive Summary

| Perspective | Description |
|-------------|-------------|
| **Problem** | 이슈(카드) 단위로만 작업을 관리할 수 있어 세부 할일 분배가 불가능. 담당자는 이슈 전체만 배정 가능하며, 개인별 세부 업무를 추적할 수 없음. |
| **Solution** | 이슈 안에 서브태스크(체크리스트) 추가. 각 서브태스크에 개별 담당자 지정. "내 할일" 뷰로 로그인 사용자의 서브태스크 모아보기 + 상위 이슈 컨텍스트 공유. |
| **Function UX Effect** | 이슈 모달에서 서브태스크 추가/체크/담당자 지정. Board 상단 "내 할일" 탭으로 나에게 배정된 서브태스크만 필터링. 각 항목에서 상위 이슈 정보 확인 가능. |
| **Core Value** | 팀 단위 이슈를 개인 단위 할일로 분해하여 협업 효율 향상. 내 업무에 집중하면서 팀 전체 진행 상황 공유. |

## 1. Background

### 현재 상태

| 영역 | 상태 | 비고 |
|------|------|------|
| 이슈(Issue) | ✅ CRUD 완료 | Kanban Board, 드래그 앤 드롭, 담당자/라벨/마감일 |
| 담당자 지정 | ✅ 이슈 단위 | profiles 테이블에서 사용자 목록 드롭다운 |
| 첨부파일 | ✅ 구현됨 | Supabase Storage, 업로드/다운로드/삭제 |
| 서브태스크 | ❌ 미구현 | 이슈 내 세부 할일 기능 없음 |
| 내 할일 뷰 | ❌ 미구현 | 로그인 사용자 기준 필터링 없음 |

### 기존 인프라
- `issues` 테이블 + `issue_attachments` 테이블 (Supabase)
- `profiles` 테이블 — 사용자 목록 (담당자 드롭다운용)
- `IssueModal` — 이슈 생성/수정 UI (첨부파일 섹션 포함)
- `fetchProfiles()` — Board 페이지에서 사용자 목록 로드
- Supabase Realtime — 이슈 변경 시 자동 갱신

## 2. Goals

| # | Goal | Priority |
|---|------|----------|
| G1 | `issue_subtasks` 테이블 생성 (Supabase) | Must |
| G2 | IssueModal에 서브태스크 CRUD UI (추가/삭제/체크/담당자 지정) | Must |
| G3 | 서브태스크 진행률 표시 (이슈 카드 + 모달) | Must |
| G4 | "내 할일" 뷰 — 로그인 사용자의 서브태스크 모아보기 | Must |
| G5 | 내 할일에서 상위 이슈 정보(제목, 상태, 라벨) 표시 | Must |
| G6 | 서브태스크 변경 시 Realtime 알림 (기존 훅 확장) | Should |

## 3. Scope

### In Scope
- `issue_subtasks` Supabase 테이블 + RLS
- 서브태스크 CRUD lib 함수 (`src/lib/subtasks.ts`)
- 서브태스크 타입 정의 (`src/types/subtask.ts`)
- IssueModal 내 서브태스크 섹션 (추가/삭제/체크/담당자)
- IssueCard에 서브태스크 진행률 뱃지 (`2/5`)
- Board 페이지 "내 할일" 탭/필터
- 내 할일 리스트에서 상위 이슈 컨텍스트 표시

### Out of Scope
- 서브태스크의 서브태스크 (중첩 불가)
- 서브태스크 드래그 앤 드롭 순서 변경
- 서브태스크 마감일/우선순위 (이슈 단위로 관리)
- 서브태스크 알림 이메일/Push

## 4. Technical Approach

### 4.1 데이터 모델

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
```

### 4.2 서브태스크 CRUD

```typescript
// src/lib/subtasks.ts
fetchSubtasks(issueId: string): Promise<Subtask[]>
createSubtask(issueId: string, title: string, assigneeId?: string, assigneeName?: string): Promise<Subtask>
updateSubtask(id: string, updates: Partial<Subtask>): Promise<Subtask>
deleteSubtask(id: string): Promise<void>
toggleSubtask(id: string, isDone: boolean): Promise<Subtask>
```

### 4.3 내 할일 뷰

로그인 사용자의 `assignee_id`와 일치하는 서브태스크를 조회하되, 상위 이슈 정보를 JOIN:

```typescript
fetchMySubtasks(userId: string): Promise<MySubtask[]>
// MySubtask = Subtask + { issue_title, issue_status, issue_labels }
```

### 4.4 UI 구조

```
Board 페이지
├── [전체 보드] [내 할일] ← 탭 전환
├── 전체 보드: 기존 Kanban Board
└── 내 할일: 서브태스크 리스트
    └── 각 항목: [✓] 서브태스크 제목 | 상위이슈: "로그인 기능 개발" (In Progress)

IssueModal (수정 모드)
├── 기존 필드들 (제목, 설명, 상태, 우선순위, 담당자, 마감일, 라벨)
├── 첨부파일 섹션
└── 서브태스크 섹션
    ├── [+] 서브태스크 추가 (제목 + 담당자 드롭다운)
    ├── [✓] 서브태스크 1 — 담당자: 박태준 [🗑]
    └── [ ] 서브태스크 2 — 담당자: 신인숙 [🗑]
```

### 4.5 IssueCard 진행률 뱃지

이슈 카드 하단에 `✓ 2/5` 형식으로 서브태스크 완료율 표시. 서브태스크가 없으면 미표시.

## 5. Affected Files

| File | Change |
|------|--------|
| `src/types/subtask.ts` | **New** — Subtask, MySubtask 타입 |
| `src/lib/subtasks.ts` | **New** — CRUD + fetchMySubtasks |
| `src/components/board/issue-modal.tsx` | **Modified** — 서브태스크 섹션 추가 |
| `src/components/board/issue-card.tsx` | **Modified** — 진행률 뱃지 추가 |
| `src/components/board/my-tasks.tsx` | **New** — 내 할일 리스트 컴포넌트 |
| `src/app/(dashboard)/board/page.tsx` | **Modified** — 탭 전환 (전체 보드/내 할일) + 서브태스크 데이터 |
| `supabase/migrations/006_issue_subtasks.sql` | **New** — 테이블 + RLS |

## 6. Dependencies

- No new packages

## 7. Risks

| Risk | Mitigation |
|------|------------|
| 서브태스크가 많아질 때 모달 UI 복잡성 | 스크롤 가능 영역 + 최대 높이 제한 (기존 `max-h-[90vh]`) |
| 내 할일 쿼리 성능 | `assignee_id`에 인덱스 추가, 페이지네이션 고려 |
| 상위 이슈 삭제 시 서브태스크 | `ON DELETE CASCADE`로 자동 삭제 |
| Realtime 서브태스크 갱신 | 이슈 단위 Realtime은 이미 동작. 서브태스크는 모달 열 때 fetch (Should: 별도 구독) |

## 8. Success Criteria

- [ ] `issue_subtasks` 테이블 생성 + RLS
- [ ] IssueModal에서 서브태스크 추가/삭제/체크/담당자 지정
- [ ] IssueCard에 서브태스크 진행률 뱃지 표시
- [ ] "내 할일" 탭에서 로그인 사용자의 서브태스크 목록 표시
- [ ] 내 할일에서 상위 이슈 제목/상태 확인 가능
- [ ] 상위 이슈 클릭 시 해당 이슈 모달 열기
