# E2E Tests (Playwright) — Plan

## Executive Summary

| Perspective | Description |
|-------------|-------------|
| **Problem** | 3개 주요 페이지(보드, 그래프, QR 명함)에 E2E 테스트가 없어 UI 회귀 감지 불가 |
| **Solution** | Playwright 테스트 스위트를 확장하여 미커버 페이지에 대한 E2E 테스트 추가 |
| **Function UX Effect** | 코드 변경 시 자동화된 회귀 테스트로 안정적 배포 가능 |
| **Core Value** | 전체 페이지 E2E 커버리지 100% 달성으로 품질 보증 체계 완성 |

## 1. 배경 및 목적

### 1.1 현재 상태

기존 `e2e/dashboard.spec.ts` (137줄)에서 다음 페이지를 커버:
- ✅ 대시보드 (`/dashboard`) — 메트릭, 차트, 활동 피드
- ✅ 분석 (`/analytics`) — 바 차트, 영역 차트
- ✅ 사용자 (`/users`) — 테이블, 필터
- ✅ 설정 (`/settings`) — 프로필, 알림 토글
- ✅ 헤더 — 검색, 알림
- ✅ 다크모드 — 토글
- ✅ 네비게이션 — 사이드바 (dashboard, analytics, users, settings만)

### 1.2 미커버 페이지

- ❌ 보드 (`/board`) — 칸반 보드, 이슈 CRUD, 필터, 드래그
- ❌ 그래프 (`/graph`) — 그래프 시각화, 필터, 검색, 노드 상세
- ❌ QR 명함 (`/qr-cards`) — 명함 리스트, QR 생성, 명함 추가/삭제

### 1.3 목표

- 미커버 3개 페이지에 대한 E2E 테스트 작성
- 네비게이션 테스트에 board, graph, qr-cards 추가
- 기존 테스트 패턴 (Korean 설명, data-testid 셀렉터) 유지

## 2. 범위

### 2.1 In Scope

| 항목 | 설명 |
|------|------|
| 보드 페이지 테스트 | 칸반 보드 렌더링, 이슈 생성 모달, 필터, 카드 클릭 |
| 그래프 페이지 테스트 | 페이지 렌더링, 필터 토글, 검색 입력 |
| QR 명함 테스트 | 명함 리스트 렌더링, 명함 추가 폼, QR 코드 표시 |
| 네비게이션 확장 | 기존 네비게이션 테스트에 3개 페이지 추가 |
| data-testid 추가 | QR 명함 페이지에 필요한 data-testid 속성 추가 |

### 2.2 Out of Scope

- 드래그 앤 드롭 테스트 (Playwright DnD는 복잡하고 불안정)
- Neo4j 실제 연결 테스트 (mock 데이터로 충분)
- 인증 플로우 E2E (Supabase/Kakao는 외부 의존성)
- 성능 테스트, 접근성 테스트
- CI/CD 파이프라인 연동

## 3. 기술 요구사항

### 3.1 기존 인프라 (변경 없음)

- `@playwright/test` ^1.58.2 (이미 설치됨)
- `playwright.config.ts` — testDir: `./e2e`, chromium only, baseURL localhost:3000
- `fullyParallel: true`, `retries: 1`

### 3.2 새 테스트 파일

| 파일 | 커버리지 |
|------|----------|
| `e2e/board.spec.ts` | 보드 페이지 전체 |
| `e2e/graph.spec.ts` | 그래프 페이지 전체 |
| `e2e/qr-cards.spec.ts` | QR 명함 페이지 전체 |

### 3.3 수정 파일

| 파일 | 변경 내용 |
|------|----------|
| `e2e/dashboard.spec.ts` | 네비게이션 테스트에 board, graph, qr-cards 추가 |
| `src/app/(dashboard)/qr-cards/page.tsx` | data-testid 속성 추가 (테스트 셀렉터용) |

### 3.4 기존 data-testid 현황

**보드 페이지** (이미 충분):
- `page-title`, `create-issue-btn`
- `kanban-board`, `column-{status}`
- `issue-card-{id}`, `issue-modal`, `issue-title-input`, `issue-save-btn`
- `issue-filters`, `issue-search`, `priority-filter`, `assignee-filter`

**그래프 페이지** (최소한):
- `page-title`
- 추가 필요: 그래프 컨테이너, 필터, 검색 (컴포넌트 확인 후 결정)

**QR 명함 페이지** (없음):
- 전체 추가 필요: 명함 리스트, 추가 버튼, 폼, QR 패널 등

## 4. 테스트 시나리오

### 4.1 보드 페이지 (`e2e/board.spec.ts`)

```
보드 페이지:
  ✓ 칸반 보드가 4개 컬럼으로 렌더링된다
  ✓ 이슈 카드가 표시된다
  ✓ 새 이슈 버튼을 클릭하면 모달이 열린다
  ✓ 이슈 카드를 클릭하면 상세 모달이 열린다
  ✓ 검색 필터가 동작한다
  ✓ 우선순위 필터가 동작한다
```

### 4.2 그래프 페이지 (`e2e/graph.spec.ts`)

```
그래프 페이지:
  ✓ 그래프 페이지가 렌더링된다 (로딩 → 컨텐츠)
  ✓ 페이지 타이틀이 "그래프"이다
  ✓ 필터 영역이 표시된다
  ✓ 검색 입력이 동작한다
```

> 참고: Canvas 기반 ForceGraph2D는 DOM 테스트 불가 → 페이지 수준 렌더링만 검증

### 4.3 QR 명함 페이지 (`e2e/qr-cards.spec.ts`)

```
QR 명함 페이지:
  ✓ 초기 명함 4개가 리스트에 표시된다
  ✓ 명함을 클릭하면 QR 코드가 표시된다
  ✓ "명함 추가" 버튼을 클릭하면 폼이 열린다
  ✓ 필수 정보를 입력하고 등록하면 명함이 추가된다
  ✓ 명함 삭제 버튼이 동작한다
```

### 4.4 네비게이션 확장

기존 네비게이션 테스트에 추가:
```
네비게이션:
  ✓ nav-board → /board → 타이틀 "보드"
  ✓ nav-graph → /graph → 타이틀 "그래프"
  ✓ nav-qr-cards → /qr-cards → 타이틀 확인
```

## 5. 구현 순서

1. QR 명함 페이지에 data-testid 추가 (테스트 인프라 준비)
2. 그래프 관련 컴포넌트에 data-testid 추가
3. `e2e/board.spec.ts` 작성
4. `e2e/graph.spec.ts` 작성
5. `e2e/qr-cards.spec.ts` 작성
6. `e2e/dashboard.spec.ts` 네비게이션 테스트 확장
7. 전체 테스트 실행 및 검증

## 6. 성공 기준

- 새 테스트 3개 파일 모두 pass
- 기존 테스트 회귀 없음
- 전체 앱 페이지 E2E 커버리지 100% (7/7 페이지)
- 네비게이션 테스트에서 전체 7개 페이지 이동 검증

## 7. 리스크 및 완화

| 리스크 | 영향 | 완화 |
|--------|------|------|
| Canvas(ForceGraph2D) DOM 접근 불가 | 그래프 노드 개별 테스트 불가 | 페이지 렌더링 + 필터/검색만 검증 |
| localStorage 의존 (QR 명함) | 테스트 간 상태 간섭 | beforeEach에서 localStorage 초기화 |
| API mock 데이터 의존 (보드) | API 미응답 시 테스트 실패 | mock 데이터 fallback 활용 |
| confirm() 다이얼로그 (삭제) | Playwright에서 핸들링 필요 | page.on('dialog') 이벤트 처리 |
