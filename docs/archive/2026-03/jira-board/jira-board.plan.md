# jira-board Planning Document

> **Summary**: JIRA-like 칸반 보드 및 이슈 트래킹 기능을 SaaS Dashboard에 추가
>
> **Project**: saas-dashboard
> **Version**: 0.1.0
> **Author**: EUNA
> **Date**: 2026-03-15
> **Status**: Draft

---

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem** | 현재 대시보드에 태스크/이슈 관리 기능이 없어, 프로젝트 진행 상황을 별도 도구(JIRA 등)에서 추적해야 하는 컨텍스트 스위칭 발생 |
| **Solution** | 대시보드 내 칸반 보드 UI + Supabase 기반 이슈 CRUD를 구현하여 통합 워크스페이스 제공 |
| **Function/UX Effect** | 드래그앤드롭 칸반 보드로 이슈 상태 변경, 이슈 생성/편집/삭제 모달, 담당자 할당 및 우선순위 관리 |
| **Core Value** | 대시보드 하나에서 데이터 분석 + 태스크 관리까지 가능한 올인원 SaaS 워크스페이스 |

---

## 1. Overview

### 1.1 Purpose

SaaS Dashboard에 JIRA-like 이슈 트래킹/칸반 보드 기능을 추가하여, 사용자가 대시보드 내에서 프로젝트 태스크를 생성, 할당, 추적할 수 있도록 한다.

### 1.2 Background

- 현재 대시보드는 메트릭 카드, 차트, 사용자 관리, QR 명함 기능만 제공
- 프로젝트 관리를 위해 외부 도구(JIRA, Trello 등)로 전환해야 하는 불편함 존재
- 카카오 로그인 + Supabase 인프라가 이미 구축되어 있어 백엔드 확장 용이
- 사용자의 Claude Plan에서 JIRA-like 기능을 핵심 요구사항으로 명시

### 1.3 Related Documents

- Claude Plan (사용자 제공): 전체 아키텍처 설계 문서
- 추후: `jira-board.design.md` (Design Phase)

---

## 2. Scope

### 2.1 In Scope

- [ ] 칸반 보드 페이지 (`/board`) — 컬럼: To Do, In Progress, In Review, Done
- [ ] 이슈 CRUD — 생성, 조회, 수정, 삭제
- [ ] 이슈 카드 — 제목, 설명, 우선순위(High/Medium/Low), 담당자, 마감일, 라벨
- [ ] 드래그앤드롭 — 이슈 카드를 컬럼 간 이동하여 상태 변경
- [ ] 담당자 할당 — 현재 사용자 목록에서 선택
- [ ] Supabase 테이블 — `issues`, `issue_labels` 테이블 설계 및 RLS 정책
- [ ] 사이드바 내비게이션 추가 — "보드" 메뉴 항목

### 2.2 Out of Scope

- 스프린트 관리 (Sprint planning, backlog grooming)
- 시간 추적 (Time tracking/logging)
- GitHub/GitLab 연동 (외부 VCS integration)
- Neo4j 그래프 시각화 (별도 feature로 분리)
- 실시간 협업 (WebSocket 기반 실시간 동기화)
- 커스텀 워크플로우 (상태 컬럼 사용자 정의)

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-01 | 칸반 보드 페이지에 4개 컬럼(To Do, In Progress, In Review, Done) 표시 | High | Pending |
| FR-02 | 이슈 생성 모달 — 제목, 설명, 우선순위, 담당자, 마감일, 라벨 입력 | High | Pending |
| FR-03 | 이슈 카드 드래그앤드롭으로 컬럼 간 이동 (상태 변경) | High | Pending |
| FR-04 | 이슈 상세 보기/편집 모달 | Medium | Pending |
| FR-05 | 이슈 삭제 (확인 다이얼로그 포함) | Medium | Pending |
| FR-06 | 담당자 할당 — 팀 사용자 목록에서 선택 | Medium | Pending |
| FR-07 | 우선순위별 필터링 | Low | Pending |
| FR-08 | 라벨(태그) 기반 필터링 | Low | Pending |

### 3.2 Non-Functional Requirements

| Category | Criteria | Measurement Method |
|----------|----------|-------------------|
| Performance | 보드 로딩 < 500ms (50개 이슈 기준) | Lighthouse / DevTools |
| UX | 드래그앤드롭 반응 시간 < 100ms | 체감 테스트 |
| Accessibility | 키보드로 이슈 이동 가능 | 수동 테스트 |
| Security | RLS로 본인 프로젝트 이슈만 접근 | Supabase RLS 정책 검증 |

---

## 4. Success Criteria

### 4.1 Definition of Done

- [ ] 모든 FR-01 ~ FR-06 (High/Medium) 구현 완료
- [ ] Supabase 테이블 및 RLS 정책 적용
- [ ] 드래그앤드롭이 모바일/데스크톱에서 정상 동작
- [ ] 사이드바에 "보드" 내비게이션 추가
- [ ] E2E 테스트(Playwright) 핵심 플로우 커버

### 4.2 Quality Criteria

- [ ] ESLint 에러 0건
- [ ] `pnpm build` 성공
- [ ] 다크 모드 정상 동작

---

## 5. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| 드래그앤드롭 라이브러리 호환성 (React 19) | High | Medium | @hello-pangea/dnd (react-beautiful-dnd fork)로 React 19 지원 확인, 안 될 경우 dnd-kit 사용 |
| Supabase RLS 정책 복잡도 | Medium | Low | 단순한 user_id 기반 정책으로 시작, 점진 확장 |
| 대량 이슈 시 보드 성능 저하 | Medium | Low | 페이지네이션 또는 가상 스크롤 적용 (v2에서) |
| 기존 모크 데이터 의존성 | Low | High | Supabase 연동 우선, fallback으로 mock 데이터 유지 |

---

## 6. Architecture Considerations

### 6.1 Project Level Selection

| Level | Characteristics | Recommended For | Selected |
|-------|-----------------|-----------------|:--------:|
| **Starter** | Simple structure (`components/`, `lib/`, `types/`) | Static sites, portfolios, landing pages | ☐ |
| **Dynamic** | Feature-based modules, BaaS integration | Web apps with backend, SaaS MVPs, fullstack apps | ☑ |
| **Enterprise** | Strict layer separation, DI, microservices | High-traffic systems, complex architectures | ☐ |

### 6.2 Key Architectural Decisions

| Decision | Options | Selected | Rationale |
|----------|---------|----------|-----------|
| Framework | Next.js 16 (App Router) | Next.js 16 | 기존 프로젝트 유지 |
| State Management | Zustand / React Query | Zustand + React state | 기존 Zustand 패턴 유지, 서버 데이터는 use/fetch 패턴 |
| DnD Library | @hello-pangea/dnd / dnd-kit | @hello-pangea/dnd | react-beautiful-dnd API 호환, 커뮤니티 활발 |
| Backend | Supabase | Supabase | 기존 인프라 활용 (Auth + DB) |
| Styling | Tailwind CSS 4 | Tailwind CSS 4 | 기존 프로젝트 유지 |
| Testing | Playwright | Playwright | 기존 E2E 설정 유지 |

### 6.3 Clean Architecture Approach

```
Selected Level: Dynamic

New Files/Folders:
src/
├── app/(dashboard)/board/
│   └── page.tsx                  # 칸반 보드 페이지
├── components/board/
│   ├── kanban-board.tsx          # 보드 컨테이너 (DnD 컨텍스트)
│   ├── kanban-column.tsx         # 단일 컬럼
│   ├── issue-card.tsx            # 이슈 카드
│   ├── issue-modal.tsx           # 생성/편집 모달
│   └── issue-filters.tsx         # 필터 바
├── lib/
│   └── issues.ts                 # Supabase issues CRUD 함수
├── types/
│   └── issue.ts                  # Issue, IssueStatus, IssuePriority 타입
```

---

## 7. Convention Prerequisites

### 7.1 Existing Project Conventions

- [x] `CLAUDE.md` exists (created this session)
- [ ] `docs/01-plan/conventions.md` — 없음
- [ ] `CONVENTIONS.md` — 없음
- [x] ESLint configuration (flat config, core-web-vitals + typescript)
- [ ] Prettier — 없음 (Tailwind 기본 포맷팅)
- [x] TypeScript strict mode (`tsconfig.json`)

### 7.2 Conventions to Define/Verify

| Category | Current State | To Define | Priority |
|----------|---------------|-----------|:--------:|
| **Naming** | PascalCase 컴포넌트, camelCase 함수 | 이슈 관련 네이밍 통일 | Medium |
| **Folder structure** | `(dashboard)/` route group 패턴 | `components/board/` 추가 | High |
| **Import order** | 없음 | 기존 패턴 따름 | Low |
| **Environment variables** | NEXT_PUBLIC_ prefix 패턴 | 추가 없음 (Supabase 기존 키 활용) | Low |
| **Error handling** | 없음 (명시적 패턴) | Supabase 에러 처리 패턴 정의 | Medium |

### 7.3 Environment Variables Needed

| Variable | Purpose | Scope | To Be Created |
|----------|---------|-------|:-------------:|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 엔드포인트 | Client | 기존 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 익명 키 | Client | 기존 |

> 추가 환경 변수 불필요 — 기존 Supabase 연결을 그대로 활용

### 7.4 Pipeline Integration

| Phase | Status | Document Location | Command |
|-------|:------:|-------------------|---------|
| Phase 1 (Schema) | ☐ | `docs/01-plan/schema.md` | 별도 진행 시 |
| Phase 2 (Convention) | ☐ | `docs/01-plan/conventions.md` | 별도 진행 시 |

---

## 8. Next Steps

1. [ ] Design 문서 작성 (`jira-board.design.md`) — Supabase 스키마, 컴포넌트 상세 설계
2. [ ] DnD 라이브러리 React 19 호환성 검증
3. [ ] 구현 시작

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-15 | Initial draft | EUNA |
