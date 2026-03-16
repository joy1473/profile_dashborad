# E2E Tests (Playwright) — Design

> Plan 참조: `docs/01-plan/features/e2e-tests.plan.md`

## 1. 개요

기존 `e2e/dashboard.spec.ts`가 커버하지 않는 3개 페이지(보드, 그래프, QR 명함)에 대한 Playwright E2E 테스트를 추가하고, 네비게이션 테스트를 전체 7개 페이지로 확장한다.

## 2. 파일 구조

### 2.1 새 파일 (3개)

| 파일 | 목적 | 예상 줄 수 |
|------|------|:----------:|
| `e2e/board.spec.ts` | 보드(칸반) 페이지 E2E 테스트 | ~70 |
| `e2e/graph.spec.ts` | 그래프 페이지 E2E 테스트 | ~40 |
| `e2e/qr-cards.spec.ts` | QR 명함 페이지 E2E 테스트 | ~80 |

### 2.2 수정 파일 (2개)

| 파일 | 변경 내용 |
|------|----------|
| `e2e/dashboard.spec.ts` | 네비게이션 `describe`에 board, graph, qr-cards 이동 테스트 추가 |
| `src/app/(dashboard)/qr-cards/page.tsx` | data-testid 속성 추가 (6개) |

### 2.3 변경 없는 파일

- `playwright.config.ts` — 기존 설정 그대로 사용
- `src/components/board/*` — 이미 충분한 data-testid 보유
- `src/components/graph/*` — 이미 `graph-filters`, `graph-search`, `node-detail-panel` 보유
- `src/app/(dashboard)/board/page.tsx` — 이미 `page-title`, `create-issue-btn` 보유
- `src/app/(dashboard)/graph/page.tsx` — 이미 `page-title` 보유

## 3. data-testid 추가 설계

### 3.1 QR 명함 페이지 — 추가 필요한 testid

현재 QR 명함 페이지(`qr-cards/page.tsx`)에는 data-testid가 0개이므로 다음을 추가:

| testid | 대상 요소 | 용도 |
|--------|----------|------|
| `page-title` | `<h1>` "QR 명함" | 페이지 타이틀 확인 (다른 페이지와 통일) |
| `add-card-btn` | "명함 추가" `<button>` | 폼 열기 테스트 |
| `card-form` | 명함 추가 폼 컨테이너 `<div>` | 폼 표시 여부 확인 |
| `card-list` | 명함 리스트 컨테이너 (lg:col-span-2) | 명함 목록 확인 |
| `card-item-{index}` | 각 명함 카드 `<div>` | 개별 명함 식별 |
| `qr-panel` | QR 코드 패널 `<div>` | QR 코드 영역 확인 |

### 3.2 적용 위치 (qr-cards/page.tsx)

```tsx
// line ~159: h1 태그
<h1 className="..." data-testid="page-title">QR 명함</h1>

// line ~163: 명함 추가 버튼
<button ... data-testid="add-card-btn">

// line ~173: 폼 컨테이너 (showForm 내부)
<div className="..." data-testid="card-form">

// line ~287: 명함 리스트 컨테이너
<div className="lg:col-span-2 space-y-3" data-testid="card-list">

// line ~291: 각 명함 카드 (map 내부)
<div key={profile.id} className="..." data-testid={`card-item-${profile.unique_id}`}>

// line ~353: QR 코드 패널
<div className="rounded-lg border..." data-testid="qr-panel">
```

## 4. 테스트 상세 설계

### 4.1 `e2e/board.spec.ts`

```typescript
test.describe("보드 페이지", () => {
  test.beforeEach → goto("/board")

  test("칸반 보드가 4개 컬럼으로 렌더링된다")
    → kanban-board 존재 확인
    → column-backlog, column-todo, column-in_progress, column-done 확인

  test("이슈 카드가 표시된다")
    → [data-testid^='issue-card-'] 최소 1개 존재

  test("새 이슈 버튼을 클릭하면 모달이 열린다")
    → create-issue-btn 클릭
    → issue-modal 표시 확인
    → issue-title-input 포커스 가능

  test("이슈 카드를 클릭하면 상세 모달이 열린다")
    → 첫 번째 issue-card 클릭
    → issue-modal 표시 확인

  test("검색 필터가 동작한다")
    → issue-search에 텍스트 입력
    → 카드 수 변경 확인 (또는 동일 — 존재하는 텍스트로 검증)

  test("우선순위 필터가 동작한다")
    → priority-filter에서 옵션 변경
    → 카드 수 변경 확인
})
```

### 4.2 `e2e/graph.spec.ts`

```typescript
test.describe("그래프 페이지", () => {
  test.beforeEach → goto("/graph")

  test("그래프 페이지가 렌더링된다")
    → page-title 텍스트 "그래프" 확인

  test("필터 영역이 표시된다")
    → graph-filters 존재 확인

  test("검색 입력이 동작한다")
    → graph-search에 텍스트 입력
    → 입력값 확인

  test("그래프 컨테이너가 렌더링된다")
    → .min-h-\\[400px\\] 요소 존재 확인
    → (Canvas는 DOM 테스트 불가 — 컨테이너만 확인)
})
```

> Canvas 기반 ForceGraph2D의 개별 노드/링크는 Playwright에서 접근 불가.
> 페이지 수준 렌더링 + 주변 UI 컴포넌트만 검증.

### 4.3 `e2e/qr-cards.spec.ts`

```typescript
test.describe("QR 명함 페이지", () => {
  test.beforeEach →
    goto("/qr-cards")
    // localStorage에 초기 데이터가 자동 생성됨 (INITIAL_PROFILES 4개)

  test("초기 명함 4개가 리스트에 표시된다")
    → card-list 존재 확인
    → [data-testid^='card-item-'] 4개 확인

  test("명함을 클릭하면 QR 코드가 표시된다")
    → 첫 번째 card-item 클릭
    → qr-panel 내부에 img[alt='QR Code'] 표시 확인

  test("명함 추가 버튼을 클릭하면 폼이 열린다")
    → add-card-btn 클릭
    → card-form 표시 확인

  test("필수 정보를 입력하고 등록하면 명함이 추가된다")
    → add-card-btn 클릭
    → 이름, 이메일, 핸드폰 input 채우기 (placeholder 텍스트로 식별)
    → "등록" 버튼 클릭
    → card-item 5개로 증가 확인

  test("명함 삭제 버튼이 동작한다")
    → page.on('dialog', d => d.accept()) // confirm 다이얼로그 처리
    → 마지막 카드의 삭제 버튼 (title="삭제") 클릭
    → card-item 3개로 감소 확인
})
```

### 4.4 네비게이션 확장 (`e2e/dashboard.spec.ts`)

기존 "사이드바에서 각 페이지로 이동할 수 있다" 테스트 내부에 추가:

```typescript
// 기존 4개 페이지 이동 이후에 추가
await page.getByTestId("nav-board").click();
await page.waitForURL(/\/board/);
await expect(page.getByTestId("page-title")).toHaveText("보드");

await page.getByTestId("nav-graph").click();
await page.waitForURL(/\/graph/);
await expect(page.getByTestId("page-title")).toHaveText("그래프");

await page.getByTestId("nav-qr-cards").click();
await page.waitForURL(/\/qr-cards/);
await expect(page.getByTestId("page-title")).toHaveText("QR 명함");
```

## 5. 테스트 패턴 및 컨벤션

### 5.1 기존 패턴 유지

| 항목 | 컨벤션 |
|------|--------|
| 테스트 설명 | 한국어 (기존과 동일) |
| 셀렉터 | `data-testid` 우선, 필요 시 CSS/role |
| 구조 | `test.describe` + `test.beforeEach` |
| 임포트 | `import { test, expect } from "@playwright/test"` |

### 5.2 특수 핸들링

| 상황 | 처리 방법 |
|------|----------|
| `confirm()` 다이얼로그 | `page.on('dialog', dialog => dialog.accept())` |
| localStorage 초기화 | QR 페이지는 자동 초기화됨 (INITIAL_PROFILES). 필요 시 `page.evaluate(() => localStorage.clear())` |
| Canvas 렌더링 | DOM 접근 불가 → 컨테이너 존재 여부만 확인 |
| API 호출 (보드) | mock 데이터가 자동 반환됨 (`/api/issues` 라우트) |
| 동적 임포트 (`ssr: false`) | 그래프 Canvas는 클라이언트 로딩 후 나타남 → `waitFor` 불필요 (컨테이너 자체는 SSR) |

## 6. 구현 순서

| 순서 | 작업 | 파일 | 의존성 |
|:----:|------|------|--------|
| 1 | QR 명함 페이지에 data-testid 추가 | `qr-cards/page.tsx` | 없음 |
| 2 | 보드 테스트 작성 | `e2e/board.spec.ts` | 없음 (testid 이미 존재) |
| 3 | 그래프 테스트 작성 | `e2e/graph.spec.ts` | 없음 (testid 이미 존재) |
| 4 | QR 명함 테스트 작성 | `e2e/qr-cards.spec.ts` | 순서 1 완료 후 |
| 5 | 네비게이션 테스트 확장 | `e2e/dashboard.spec.ts` | 없음 |

> 순서 2, 3, 5는 독립적이므로 병렬 작성 가능. 순서 4만 순서 1에 의존.

## 7. 검증 방법

```bash
# 전체 E2E 테스트 실행
pnpm exec playwright test

# 개별 파일 실행
pnpm exec playwright test e2e/board.spec.ts
pnpm exec playwright test e2e/graph.spec.ts
pnpm exec playwright test e2e/qr-cards.spec.ts

# 기존 테스트 회귀 확인
pnpm exec playwright test e2e/dashboard.spec.ts
```

## 8. 성공 기준

- [ ] 새 테스트 파일 3개 모두 pass
- [ ] 기존 `dashboard.spec.ts` 테스트 회귀 없음
- [ ] 네비게이션 테스트에서 7개 페이지 이동 검증
- [ ] QR 명함 페이지에 data-testid 6개 추가
- [ ] 총 수정 파일 2개 + 새 파일 3개
