# neo4j-graph Planning Document

> **Summary**: Neo4j 기반 관계 그래프 시각화 페이지를 SaaS Dashboard에 추가
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
| **Problem** | 대시보드의 데이터(사용자, 이슈, 관계)가 테이블/카드 형태로만 표현되어 엔티티 간 관계와 네트워크 구조를 파악하기 어려움 |
| **Solution** | Neo4j 그래프 DB 연동 + 인터랙티브 force-directed 그래프 시각화 페이지 구현 |
| **Function/UX Effect** | 노드 클릭으로 상세 정보 확인, 줌/패닝/드래그로 탐색, 관계 유형별 필터링, 검색으로 특정 노드 포커스 |
| **Core Value** | 데이터 간 숨겨진 관계를 시각적으로 발견하여 의사결정 품질 향상 — 테이블로는 불가능한 인사이트 제공 |

---

## 1. Overview

### 1.1 Purpose

SaaS Dashboard에 Neo4j 그래프 데이터베이스 연동 및 인터랙티브 그래프 시각화 페이지(`/graph`)를 추가하여, 사용자/이슈/프로젝트 간 관계를 네트워크 그래프로 탐색할 수 있도록 한다.

### 1.2 Background

- 현재 대시보드는 메트릭, 차트(Recharts), 테이블, 칸반 보드로 데이터를 표현
- 엔티티 간 관계(사용자-이슈 할당, 이슈-라벨 분류, 사용자-사용자 협업)는 테이블 형태로는 직관적 파악이 어려움
- Neo4j는 관계 중심 데이터 모델에 최적화된 그래프 DB로, Cypher 쿼리로 복잡한 관계 탐색 가능
- 사용자의 Claude Plan에서 Neo4j 그래프 시각화를 핵심 요구사항으로 명시

### 1.3 Related Documents

- Claude Plan (사용자 제공): 전체 아키텍처 설계 문서
- jira-board (archived): 이슈 데이터가 그래프 노드의 주요 소스
- 추후: `neo4j-graph.design.md` (Design Phase)

---

## 2. Scope

### 2.1 In Scope

- [ ] 그래프 시각화 페이지 (`/graph`) — force-directed 인터랙티브 그래프
- [ ] Neo4j 연결 — Next.js API Route를 통한 서버사이드 Neo4j 드라이버 연동
- [ ] 노드 타입 — User, Issue, Label (3가지 엔티티)
- [ ] 관계 타입 — ASSIGNED_TO, LABELED_WITH, CREATED_BY
- [ ] 그래프 인터랙션 — 줌, 패닝, 노드 드래그, 노드 클릭 상세 패널
- [ ] 필터링 — 노드 타입별, 관계 타입별 필터
- [ ] 검색 — 노드 이름 검색 및 포커스 이동
- [ ] Mock 데이터 폴백 — Neo4j 미연결 시 mock 그래프 데이터
- [ ] 사이드바 내비게이션 추가 — "그래프" 메뉴 항목

### 2.2 Out of Scope

- 그래프 데이터 편집 (노드/관계 생성/삭제는 그래프 UI에서 불가)
- 실시간 그래프 업데이트 (WebSocket)
- 3D 그래프 시각화
- Neo4j 관리 UI (Cypher 쿼리 실행기 등)
- 그래프 알고리즘 (최단경로, 커뮤니티 탐지 등)
- 대규모 그래프 최적화 (1000+ 노드)

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-01 | 그래프 페이지에 force-directed 레이아웃으로 노드/엣지 렌더링 | High | Pending |
| FR-02 | 노드 타입별 시각 구분 (색상 + 아이콘: User=blue, Issue=orange, Label=green) | High | Pending |
| FR-03 | 노드 클릭 시 사이드 패널에 상세 정보 표시 | High | Pending |
| FR-04 | 줌, 패닝, 노드 드래그 인터랙션 | High | Pending |
| FR-05 | 노드 타입별 필터 토글 (User/Issue/Label 표시/숨기기) | Medium | Pending |
| FR-06 | 관계 타입별 필터 토글 | Medium | Pending |
| FR-07 | 노드 이름 검색 및 해당 노드로 포커스 이동 | Medium | Pending |
| FR-08 | Neo4j API Route — Cypher 쿼리 실행 및 그래프 데이터 반환 | High | Pending |
| FR-09 | Mock 그래프 데이터 폴백 (Neo4j 미연결 시) | High | Pending |
| FR-10 | 관계 엣지에 방향 표시 (화살표) 및 라벨 | Low | Pending |

### 3.2 Non-Functional Requirements

| Category | Criteria | Measurement Method |
|----------|----------|-------------------|
| Performance | 200 노드 기준 60fps 렌더링 | Chrome DevTools FPS 모니터 |
| Performance | 그래프 데이터 로딩 < 1초 | Network tab |
| UX | 첫 렌더링 시 노드가 자연스럽게 안정 위치로 수렴 | 시각 확인 |
| Accessibility | 키보드로 노드 간 이동 가능 | 수동 테스트 |
| Security | Neo4j credentials 서버사이드만 노출 | API Route 검증 |

---

## 4. Success Criteria

### 4.1 Definition of Done

- [ ] FR-01 ~ FR-09 (High/Medium) 구현 완료
- [ ] Neo4j 연결 + mock 폴백 정상 동작
- [ ] 사이드바에 "그래프" 내비게이션 추가
- [ ] 다크 모드 정상 동작
- [ ] `pnpm build` 성공, 0 new lint errors

### 4.2 Quality Criteria

- [ ] ESLint 에러 0건 (신규)
- [ ] 200 노드에서 렌더링 성능 유지
- [ ] 다크 모드 전체 지원

---

## 5. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| 그래프 시각화 라이브러리 React 19 호환성 | High | Medium | react-force-graph (Three.js/D3 기반) React 19 호환 확인, 안 될 경우 @antv/g6 또는 직접 D3 사용 |
| Neo4j 드라이버 서버/클라이언트 혼동 | High | Medium | Next.js API Route(서버사이드)에서만 neo4j-driver 사용, 클라이언트는 fetch로 API 호출 |
| 대량 노드 렌더링 성능 | Medium | Low | WebGL 기반 렌더러 사용 (react-force-graph는 Canvas/WebGL 지원), 노드 수 제한(200) |
| Neo4j 무료 티어 제한 (AuraDB Free) | Low | Medium | Mock 데이터로 개발, 프로덕션 시 AuraDB Free 또는 Docker 로컬 인스턴스 |
| SSR에서 Canvas/WebGL 렌더링 오류 | Medium | High | `dynamic(() => import(...), { ssr: false })` 로 클라이언트 전용 렌더링 |

---

## 6. Architecture Considerations

### 6.1 Project Level Selection

| Level | Characteristics | Recommended For | Selected |
|-------|-----------------|-----------------|:--------:|
| **Starter** | Simple structure (`components/`, `lib/`, `types/`) | Static sites, portfolios | ☐ |
| **Dynamic** | Feature-based modules, BaaS integration | Web apps with backend, SaaS MVPs | ☑ |
| **Enterprise** | Strict layer separation, DI, microservices | High-traffic systems | ☐ |

### 6.2 Key Architectural Decisions

| Decision | Options | Selected | Rationale |
|----------|---------|----------|-----------|
| Graph Viz Library | react-force-graph / @antv/g6 / cytoscape.js / vis-network | react-force-graph-2d | 경량, React 친화적, Canvas/WebGL 2D 렌더링, force-directed 내장, 활발한 유지보수 |
| Neo4j Connection | neo4j-driver (직접) / GraphQL (neo4j-graphql) | neo4j-driver via API Route | 심플, 직접 Cypher 쿼리, 서버사이드 보안 |
| API Pattern | API Route / Server Action | Next.js API Route (`/api/graph`) | neo4j-driver는 Node.js 전용, API Route가 서버사이드 실행 보장 |
| State Management | useState / Zustand | useState + useMemo | jira-board 패턴 유지, v1 단순성 |
| Mock Fallback | USE_MOCK flag | 기존 패턴 (ENV 체크) | `!process.env.NEO4J_URI` 시 mock 반환 |
| SSR Handling | dynamic import (ssr: false) | dynamic import | Canvas/WebGL은 브라우저 전용 |

### 6.3 Clean Architecture Approach

```
Selected Level: Dynamic

New Files/Folders:
src/
├── app/
│   ├── (dashboard)/graph/
│   │   └── page.tsx                  # 그래프 시각화 페이지
│   └── api/graph/
│       └── route.ts                  # Neo4j API Route (서버사이드)
├── components/graph/
│   ├── graph-canvas.tsx              # react-force-graph-2d 래퍼 (dynamic import)
│   ├── graph-filters.tsx             # 노드/관계 타입 필터 UI
│   ├── graph-search.tsx              # 노드 검색 입력
│   └── node-detail-panel.tsx         # 노드 클릭 시 상세 패널
├── lib/
│   ├── neo4j.ts                      # Neo4j 드라이버 싱글턴 (서버전용)
│   └── mock-graph.ts                 # Mock 그래프 데이터
└── types/
    └── graph.ts                      # GraphNode, GraphEdge, GraphData 타입
```

---

## 7. Convention Prerequisites

### 7.1 Existing Project Conventions

- [x] `CLAUDE.md` exists
- [ ] `docs/01-plan/conventions.md` — 없음
- [x] ESLint configuration (flat config)
- [x] TypeScript strict mode
- [x] Tailwind CSS 4 + `cn()` utility

### 7.2 Conventions to Define/Verify

| Category | Current State | To Define | Priority |
|----------|---------------|-----------|:--------:|
| **Naming** | PascalCase 컴포넌트, camelCase 함수 | 그래프 관련 네이밍 통일 (GraphNode vs Node) | Medium |
| **Folder structure** | `components/board/` 패턴 유지 | `components/graph/` 추가 | High |
| **API Route** | 없음 (기존은 Supabase 직접) | `/api/graph` 패턴 도입 | High |
| **Server-only imports** | 없음 | `neo4j-driver`는 서버전용 명시 | High |
| **Error handling** | Toast 패턴 (jira-board에서 도입) | 그래프 로딩 에러에 재사용 | Medium |

### 7.3 Environment Variables Needed

| Variable | Purpose | Scope | To Be Created |
|----------|---------|-------|:-------------:|
| `NEO4J_URI` | Neo4j 연결 URI (bolt://) | Server | ☑ |
| `NEO4J_USERNAME` | Neo4j 사용자명 | Server | ☑ |
| `NEO4J_PASSWORD` | Neo4j 비밀번호 | Server | ☑ |

> `NEXT_PUBLIC_` prefix 없음 — 모든 Neo4j 인증 정보는 서버사이드 전용

### 7.4 Pipeline Integration

| Phase | Status | Document Location | Command |
|-------|:------:|-------------------|---------|
| Phase 1 (Schema) | ☐ | `docs/01-plan/schema.md` | 별도 진행 시 |
| Phase 2 (Convention) | ☐ | `docs/01-plan/conventions.md` | 별도 진행 시 |

---

## 8. Next Steps

1. [ ] Design 문서 작성 (`neo4j-graph.design.md`) — Neo4j 스키마, 컴포넌트 상세 설계, API Route 스펙
2. [ ] react-force-graph-2d React 19 호환성 검증
3. [ ] 구현 시작

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-15 | Initial draft | EUNA |
