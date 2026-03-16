# neo4j-graph Design Document

> **Summary**: Neo4j 그래프 DB 연동 + react-force-graph-2d 기반 인터랙티브 관계 그래프 시각화
>
> **Project**: saas-dashboard
> **Version**: 0.1.0
> **Author**: EUNA
> **Date**: 2026-03-15
> **Status**: Draft
> **Planning Doc**: [neo4j-graph.plan.md](../../01-plan/features/neo4j-graph.plan.md)

### Pipeline References

| Phase | Document | Status |
|-------|----------|--------|
| Phase 1 | Schema Definition | N/A |
| Phase 2 | Coding Conventions | N/A |
| Phase 3 | Mockup | N/A |
| Phase 4 | API Spec | Included below |

---

## 1. Overview

### 1.1 Design Goals

- Neo4j 그래프 데이터를 인터랙티브 force-directed 2D 그래프로 시각화
- 서버사이드 Neo4j 드라이버 연동 (API Route 패턴)
- Mock 데이터 폴백으로 Neo4j 미연결 환경에서도 개발 가능
- 기존 대시보드 디자인 시스템(Tailwind, 다크모드, Toast) 재활용

### 1.2 Design Principles

- **서버/클라이언트 분리**: Neo4j credentials는 서버사이드(API Route)에서만 사용
- **Progressive Enhancement**: Mock 데이터 → Neo4j 연동 순서로 점진적 구현
- **Canvas 렌더링**: WebGL/Canvas 기반으로 대량 노드에서도 60fps 유지
- **SSR 회피**: 그래프 컴포넌트는 `dynamic import (ssr: false)`로 클라이언트 전용

---

## 2. Architecture

### 2.1 Component Diagram

```
┌─────────────────────────────────────────────────────────┐
│  Browser (Client)                                       │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │  GraphPage (/graph)                              │   │
│  │  ┌────────────┐ ┌─────────────────────────────┐  │   │
│  │  │GraphFilters│ │  GraphCanvas (dynamic)       │  │   │
│  │  │GraphSearch │ │  react-force-graph-2d        │  │   │
│  │  └────────────┘ │  ┌───────┐ ┌───────┐        │  │   │
│  │                  │  │ Nodes │ │ Links │        │  │   │
│  │                  │  └───────┘ └───────┘        │  │   │
│  │                  └─────────────────────────────┘  │   │
│  │  ┌────────────────────────────────┐               │   │
│  │  │  NodeDetailPanel (slide-out)   │               │   │
│  │  └────────────────────────────────┘               │   │
│  └──────────────────────────────────────────────────┘   │
│                          │ fetch                        │
└──────────────────────────┼──────────────────────────────┘
                           ▼
┌──────────────────────────────────────────────────────────┐
│  Next.js Server                                          │
│  ┌──────────────────────────────────┐                    │
│  │  /api/graph (route.ts)           │                    │
│  │  - GET: 그래프 데이터 반환        │                    │
│  │  - Mock fallback (no Neo4j)      │                    │
│  └──────────────┬───────────────────┘                    │
│                 │ neo4j-driver                            │
└─────────────────┼────────────────────────────────────────┘
                  ▼
┌──────────────────────────────────────────────────────────┐
│  Neo4j Database (AuraDB / Docker)                        │
│  - Nodes: User, Issue, Label                             │
│  - Relationships: ASSIGNED_TO, LABELED_WITH, CREATED_BY  │
└──────────────────────────────────────────────────────────┘
```

### 2.2 Data Flow

```
Page Load → fetch /api/graph → Neo4j Cypher Query (or Mock) → Transform to {nodes, links}
  → react-force-graph-2d renders → User interacts (click/zoom/drag/filter/search)
  → Client-side filtering (no re-fetch) → UI updates
```

### 2.3 Dependencies

| Component | Depends On | Purpose |
|-----------|-----------|---------|
| GraphPage | GraphCanvas, GraphFilters, GraphSearch, NodeDetailPanel | Page composition |
| GraphCanvas | react-force-graph-2d | Force-directed rendering |
| /api/graph | neo4j-driver (optional), mock-graph | Data source |
| GraphFilters | GraphPage state | Filter node/link visibility |
| NodeDetailPanel | GraphPage state (selectedNode) | Show node details |

---

## 3. Data Model

### 3.1 TypeScript Type Definitions (`src/types/graph.ts`)

```typescript
// Node types in the graph
export type GraphNodeType = "user" | "issue" | "label";

// Relationship types
export type GraphLinkType = "ASSIGNED_TO" | "LABELED_WITH" | "CREATED_BY";

// A node in the graph
export interface GraphNode {
  id: string;
  name: string;
  type: GraphNodeType;
  // Type-specific metadata
  meta?: {
    email?: string;         // user
    role?: string;          // user
    status?: string;        // user | issue
    priority?: string;      // issue
    color?: string;         // label
    [key: string]: string | undefined;
  };
  // Force-graph internal (optional, set by library)
  x?: number;
  y?: number;
  fx?: number;  // fixed x (for pinned nodes)
  fy?: number;  // fixed y
}

// A link (edge) in the graph
export interface GraphLink {
  source: string;  // source node id
  target: string;  // target node id
  type: GraphLinkType;
  label?: string;  // display label on edge
}

// The full graph data structure (react-force-graph format)
export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

// Filter state
export interface GraphFilterState {
  nodeTypes: Record<GraphNodeType, boolean>;   // toggle visibility
  linkTypes: Record<GraphLinkType, boolean>;   // toggle visibility
  search: string;                              // node name search
}

// Selected node for detail panel
export type SelectedNode = GraphNode | null;
```

### 3.2 Entity Relationships

```
[User] ──CREATED_BY──▶ [Issue]
[User] ◀──ASSIGNED_TO── [Issue]
[Issue] ──LABELED_WITH──▶ [Label]
```

### 3.3 Neo4j Schema (Cypher)

```cypher
// ===== Node Constraints =====
CREATE CONSTRAINT user_id IF NOT EXISTS
  FOR (u:User) REQUIRE u.id IS UNIQUE;

CREATE CONSTRAINT issue_id IF NOT EXISTS
  FOR (i:Issue) REQUIRE i.id IS UNIQUE;

CREATE CONSTRAINT label_name IF NOT EXISTS
  FOR (l:Label) REQUIRE l.name IS UNIQUE;

// ===== Indexes =====
CREATE INDEX user_name IF NOT EXISTS FOR (u:User) ON (u.name);
CREATE INDEX issue_title IF NOT EXISTS FOR (i:Issue) ON (i.title);

// ===== Sample Data =====

// Users (from mock-data.ts)
CREATE (u1:User {id: "1", name: "김민수", email: "minsu@example.com", role: "admin", status: "active"})
CREATE (u2:User {id: "2", name: "이지은", email: "jieun@example.com", role: "user", status: "active"})
CREATE (u3:User {id: "3", name: "박서준", email: "seojun@example.com", role: "user", status: "inactive"})
CREATE (u4:User {id: "4", name: "최유리", email: "yuri@example.com", role: "viewer", status: "active"})
CREATE (u5:User {id: "5", name: "정하늘", email: "haneul@example.com", role: "user", status: "active"})

// Issues (from mock-issues.ts)
CREATE (i1:Issue {id: "issue-1", title: "로그인 페이지 오류 수정", status: "todo", priority: "high"})
CREATE (i2:Issue {id: "issue-2", title: "대시보드 차트 반응형 개선", status: "in_progress", priority: "medium"})
CREATE (i3:Issue {id: "issue-3", title: "QR 명함 공유 기능", status: "todo", priority: "medium"})
CREATE (i4:Issue {id: "issue-4", title: "사용자 목록 페이지네이션", status: "done", priority: "low"})
CREATE (i5:Issue {id: "issue-5", title: "다크모드 색상 통일", status: "done", priority: "low"})
CREATE (i6:Issue {id: "issue-6", title: "설정 페이지 알림 토글 버그", status: "in_review", priority: "high"})

// Labels
CREATE (l1:Label {name: "bug", color: "#ef4444"})
CREATE (l2:Label {name: "auth", color: "#8b5cf6"})
CREATE (l3:Label {name: "ui", color: "#3b82f6"})
CREATE (l4:Label {name: "responsive", color: "#06b6d4"})
CREATE (l5:Label {name: "feature", color: "#22c55e"})
CREATE (l6:Label {name: "enhancement", color: "#f59e0b"})
CREATE (l7:Label {name: "darkmode", color: "#6366f1"})

// Relationships: ASSIGNED_TO (User -> Issue)
CREATE (u1)-[:ASSIGNED_TO]->(i1)
CREATE (u2)-[:ASSIGNED_TO]->(i2)
CREATE (u4)-[:ASSIGNED_TO]->(i4)
CREATE (u1)-[:ASSIGNED_TO]->(i5)
CREATE (u2)-[:ASSIGNED_TO]->(i6)

// Relationships: CREATED_BY (Issue -> User, representing user_id)
CREATE (i1)-[:CREATED_BY]->(u1)
CREATE (i2)-[:CREATED_BY]->(u1)
CREATE (i3)-[:CREATED_BY]->(u1)
CREATE (i4)-[:CREATED_BY]->(u1)
CREATE (i5)-[:CREATED_BY]->(u1)
CREATE (i6)-[:CREATED_BY]->(u1)

// Relationships: LABELED_WITH (Issue -> Label)
CREATE (i1)-[:LABELED_WITH]->(l1)
CREATE (i1)-[:LABELED_WITH]->(l2)
CREATE (i2)-[:LABELED_WITH]->(l3)
CREATE (i2)-[:LABELED_WITH]->(l4)
CREATE (i3)-[:LABELED_WITH]->(l5)
CREATE (i4)-[:LABELED_WITH]->(l6)
CREATE (i5)-[:LABELED_WITH]->(l3)
CREATE (i5)-[:LABELED_WITH]->(l7)
CREATE (i6)-[:LABELED_WITH]->(l1)
```

---

## 4. API Specification

### 4.1 Endpoint List

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/graph` | 전체 그래프 데이터 반환 (nodes + links) | Required (session) |

### 4.2 Detailed Specification

#### `GET /api/graph`

**Cypher Query:**
```cypher
MATCH (n)
OPTIONAL MATCH (n)-[r]->(m)
RETURN n, r, m
```

**Response (200 OK):**
```json
{
  "nodes": [
    { "id": "1", "name": "김민수", "type": "user", "meta": { "email": "minsu@example.com", "role": "admin", "status": "active" } },
    { "id": "issue-1", "name": "로그인 페이지 오류 수정", "type": "issue", "meta": { "status": "todo", "priority": "high" } },
    { "id": "label-bug", "name": "bug", "type": "label", "meta": { "color": "#ef4444" } }
  ],
  "links": [
    { "source": "1", "target": "issue-1", "type": "ASSIGNED_TO" },
    { "source": "issue-1", "target": "1", "type": "CREATED_BY" },
    { "source": "issue-1", "target": "label-bug", "type": "LABELED_WITH" }
  ]
}
```

**Error Responses:**
- `401 Unauthorized`: Session not found
- `500 Internal Server Error`: Neo4j connection failed (returns mock as fallback)

### 4.3 Neo4j Driver Singleton (`src/lib/neo4j.ts`)

```typescript
// Server-only module — import only in API routes
import neo4j, { Driver } from "neo4j-driver";

let driver: Driver | null = null;

export function getDriver(): Driver | null {
  const uri = process.env.NEO4J_URI;
  const user = process.env.NEO4J_USERNAME;
  const password = process.env.NEO4J_PASSWORD;

  if (!uri || !user || !password) return null;

  if (!driver) {
    driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
  }
  return driver;
}

export async function runCypher<T>(query: string, params?: Record<string, unknown>): Promise<T[]> {
  const d = getDriver();
  if (!d) throw new Error("Neo4j not configured");
  const session = d.session();
  try {
    const result = await session.run(query, params);
    return result.records as unknown as T[];
  } finally {
    await session.close();
  }
}
```

### 4.4 API Route Implementation Pattern (`src/app/api/graph/route.ts`)

```typescript
import { NextResponse } from "next/server";
import { getDriver } from "@/lib/neo4j";
import { mockGraphData } from "@/lib/mock-graph";
import type { GraphData, GraphNode, GraphLink } from "@/types/graph";

export async function GET(request: Request) {
  // Auth check — verify Supabase session via cookie
  // Returns 401 if Supabase is configured but session is missing

  const driver = getDriver();

  // Mock fallback when Neo4j is not configured
  if (!driver) {
    return NextResponse.json(mockGraphData);
  }

  const session = driver.session();
  try {
    // Fetch all nodes and relationships
    const result = await session.run(`
      MATCH (n)
      OPTIONAL MATCH (n)-[r]->(m)
      RETURN n, labels(n) AS nLabels, r, type(r) AS rType, m, labels(m) AS mLabels
    `);

    const nodesMap = new Map<string, GraphNode>();
    const links: GraphLink[] = [];

    for (const record of result.records) {
      // Process source node
      const n = record.get("n");
      const nLabels = record.get("nLabels") as string[];
      if (n && !nodesMap.has(n.properties.id)) {
        nodesMap.set(n.properties.id, {
          id: n.properties.id,
          name: n.properties.name ?? n.properties.title ?? n.properties.id,
          type: nLabels[0]?.toLowerCase() as GraphNode["type"],
          meta: { ...n.properties },
        });
      }

      // Process target node
      const m = record.get("m");
      const mLabels = record.get("mLabels") as string[] | null;
      if (m && mLabels && !nodesMap.has(m.properties.id)) {
        nodesMap.set(m.properties.id, {
          id: m.properties.id,
          name: m.properties.name ?? m.properties.title ?? m.properties.id,
          type: mLabels[0]?.toLowerCase() as GraphNode["type"],
          meta: { ...m.properties },
        });
      }

      // Process relationship
      const rType = record.get("rType") as string | null;
      if (rType && n && m) {
        links.push({
          source: n.properties.id,
          target: m.properties.id,
          type: rType as GraphLink["type"],
        });
      }
    }

    const data: GraphData = {
      nodes: Array.from(nodesMap.values()),
      links,
    };

    return NextResponse.json(data);
  } catch (error) {
    console.error("Neo4j query failed, falling back to mock:", error);
    return NextResponse.json(mockGraphData);
  } finally {
    await session.close();
  }
}
```

---

## 5. UI/UX Design

### 5.1 Screen Layout

```
┌──────────────────────────────────────────────────────────────────┐
│  Header                                                          │
├──────┬───────────────────────────────────────────────────────────┤
│      │  ┌──────────────────────────────────────────────────┐     │
│      │  │  그래프                            [검색입력...]  │     │
│      │  ├──────────────────────────────────────────────────┤     │
│      │  │  ┌─ Filters ──────────────────┐                  │     │
│ Side │  │  │ [●User] [●Issue] [●Label]  │                  │     │
│ bar  │  │  │ [ASSIGNED] [LABELED] [CREATED]│                │     │
│      │  │  └────────────────────────────┘                  │     │
│      │  │                                                  │     │
│      │  │     ┌───┐    ASSIGNED_TO     ┌──────┐           │     │
│      │  │     │ U ├──────────────────▶ │ ISS  │           │     │
│      │  │     └───┘                    └──┬───┘           │     │
│      │  │                                 │ LABELED_WITH  │     │
│      │  │        ┌──────┐                 ▼               │     │
│      │  │        │ ISS  │◀── CREATED  ┌──────┐           │     │
│      │  │        └──────┘             │  LBL │           │     │
│      │  │                             └──────┘           │     │
│      │  │          [Canvas: zoom/pan/drag]                │     │
│      │  └──────────────────────────────────────────────────┘     │
│      │                                                           │
│      │  ┌── NodeDetailPanel (on click) ─────────────────────┐   │
│      │  │  김민수 (User)                              [×]    │   │
│      │  │  Email: minsu@example.com                          │   │
│      │  │  Role: admin  |  Status: active                    │   │
│      │  │  Connected: 3 issues, 0 labels                     │   │
│      │  └────────────────────────────────────────────────────┘   │
├──────┴───────────────────────────────────────────────────────────┤
```

### 5.2 Node Visual Encoding

| Node Type | Color | Size | Shape |
|-----------|-------|------|-------|
| User | `#3b82f6` (blue-500) | 8px | Circle |
| Issue | `#f97316` (orange-500) | 6px | Circle |
| Label | `#22c55e` (green-500) | 5px | Circle |

Dark mode uses same colors (sufficient contrast on dark backgrounds).

### 5.3 Link Visual Encoding

| Link Type | Color | Width | Arrow |
|-----------|-------|-------|-------|
| ASSIGNED_TO | `#60a5fa` (blue-400) | 1.5px | Yes (length: 6) |
| LABELED_WITH | `#4ade80` (green-400) | 1px | Yes (length: 4) |
| CREATED_BY | `#fb923c` (orange-400) | 1px | Yes (length: 4) |

### 5.4 User Flow

```
Page Load → Loading spinner → Graph renders (force simulation)
  → Hover node: tooltip with name
  → Click node: NodeDetailPanel opens (bottom)
  → Toggle filter: nodes/links hide/show (client-side)
  → Type in search: matching node highlighted + camera focuses
  → Drag node: pin to position (fx/fy set on dragEnd)
  → Scroll/pinch: zoom in/out
  → Click background: deselect node, close panel
```

### 5.5 Component List

| Component | Location | Responsibility |
|-----------|----------|----------------|
| `GraphPage` | `src/app/(dashboard)/graph/page.tsx` | Page orchestrator, state management, data fetching |
| `GraphCanvas` | `src/components/graph/graph-canvas.tsx` | react-force-graph-2d wrapper, dynamic import (ssr: false) |
| `GraphFilters` | `src/components/graph/graph-filters.tsx` | Node type + link type toggle buttons |
| `GraphSearch` | `src/components/graph/graph-search.tsx` | Search input with node focus |
| `NodeDetailPanel` | `src/components/graph/node-detail-panel.tsx` | Selected node detail display (bottom panel) |

---

## 6. Error Handling

### 6.1 Error Scenarios

| Scenario | Cause | Handling | UI Feedback |
|----------|-------|----------|-------------|
| Neo4j not configured | Missing ENV vars | Return mock data | Silent (user sees graph data) |
| Neo4j connection failed | Network/auth error | Catch → return mock + console.error | Toast: "데이터베이스 연결 실패, 샘플 데이터를 표시합니다" |
| Fetch /api/graph failed | Network error | Error state + retry button | Error banner with retry |
| Empty graph data | No nodes | Show empty state message | "표시할 그래프 데이터가 없습니다" |
| Canvas render error | Browser compatibility | ErrorBoundary | Fallback message |

### 6.2 Error Response Format

```json
{
  "error": {
    "code": "NEO4J_CONNECTION_FAILED",
    "message": "Failed to connect to Neo4j database"
  }
}
```

> API Route falls back to mock data silently — errors are logged server-side only. Client always receives valid GraphData.

---

## 7. Security Considerations

- [x] Neo4j credentials (NEO4J_URI, NEO4J_USERNAME, NEO4J_PASSWORD) — 서버사이드 API Route에서만 사용, `NEXT_PUBLIC_` 없음
- [x] API Route auth check — 대시보드 레이아웃의 세션 검증에 의존 (기존 패턴)
- [x] Cypher injection 방지 — 파라미터 바인딩 사용 (`$params`), 문자열 보간 금지
- [x] XSS — React 기본 이스케이프, Canvas 렌더링 (DOM 아님)
- [x] Rate limiting — Next.js / Vercel 기본 제한

---

## 8. Test Plan

### 8.1 Test Scope

| Type | Target | Tool |
|------|--------|------|
| Manual | Graph rendering, interaction | Browser DevTools |
| E2E | Page load, filter, search | Playwright (deferred) |

### 8.2 Test Cases (Key)

- [ ] 페이지 로드 시 그래프 정상 렌더링 (mock 모드)
- [ ] 노드 클릭 시 상세 패널 표시
- [ ] 필터 토글 시 해당 노드/링크 표시/숨기기
- [ ] 검색 입력 시 매칭 노드로 카메라 이동
- [ ] 다크 모드에서 노드/링크 색상 정상 표시
- [ ] Neo4j 미연결 시 mock 데이터로 정상 렌더링

---

## 9. Clean Architecture

### 9.1 Layer Structure

| Layer | Responsibility | Location |
|-------|---------------|----------|
| **Presentation** | UI components, page, interactions | `src/app/(dashboard)/graph/`, `src/components/graph/` |
| **Domain** | GraphNode, GraphLink, GraphData types | `src/types/graph.ts` |
| **Infrastructure** | Neo4j driver, API route, mock data | `src/lib/neo4j.ts`, `src/lib/mock-graph.ts`, `src/app/api/graph/` |

### 9.2 Dependency Rules

```
GraphPage (Presentation) → fetch /api/graph → API Route (Infrastructure) → Neo4j / Mock
GraphPage (Presentation) → imports from @/types/graph (Domain)
GraphCanvas (Presentation) → react-force-graph-2d (External)
```

> Note: GraphPage fetches via HTTP (`/api/graph`), not by importing `neo4j.ts` directly. This cleanly separates server-only code from client components.

### 9.3 This Feature's Layer Assignment

| Component | Layer | Location |
|-----------|-------|----------|
| GraphPage | Presentation | `src/app/(dashboard)/graph/page.tsx` |
| GraphCanvas | Presentation | `src/components/graph/graph-canvas.tsx` |
| GraphFilters | Presentation | `src/components/graph/graph-filters.tsx` |
| GraphSearch | Presentation | `src/components/graph/graph-search.tsx` |
| NodeDetailPanel | Presentation | `src/components/graph/node-detail-panel.tsx` |
| Graph types | Domain | `src/types/graph.ts` |
| Neo4j driver | Infrastructure | `src/lib/neo4j.ts` |
| Mock graph data | Infrastructure | `src/lib/mock-graph.ts` |
| API route | Infrastructure | `src/app/api/graph/route.ts` |

---

## 10. Coding Convention Reference

### 10.1 Naming Conventions (This Feature)

| Target | Rule | Example |
|--------|------|---------|
| Components | PascalCase | `GraphCanvas`, `NodeDetailPanel` |
| Functions | camelCase | `getDriver()`, `fetchGraphData()` |
| Constants | UPPER_SNAKE_CASE | `NODE_COLORS`, `LINK_COLORS` |
| Types | PascalCase | `GraphNode`, `GraphLink`, `GraphData` |
| Files | kebab-case.tsx/ts | `graph-canvas.tsx`, `mock-graph.ts` |
| Folders | kebab-case | `components/graph/` |

### 10.2 Import Order

```typescript
// 1. External libraries
import dynamic from "next/dynamic";
import { useState, useCallback, useMemo, useRef } from "react";

// 2. Internal absolute imports
import { useToast } from "@/components/ui/toast";

// 3. Relative imports
import { GraphFilters } from "./graph-filters";

// 4. Type imports
import type { GraphData, GraphNode } from "@/types/graph";
```

### 10.3 Environment Variables

| Variable | Purpose | Scope |
|----------|---------|-------|
| `NEO4J_URI` | Neo4j bolt:// URI | Server only |
| `NEO4J_USERNAME` | Neo4j auth user | Server only |
| `NEO4J_PASSWORD` | Neo4j auth password | Server only |

### 10.4 This Feature's Conventions

| Item | Convention Applied |
|------|-------------------|
| Component naming | PascalCase, `Graph` prefix for all graph components |
| File organization | `src/components/graph/` (presentation), `src/lib/neo4j.ts` (infra) |
| State management | React useState in GraphPage (v1 simplicity, like board page) |
| Error handling | Toast notifications (reuse existing `useToast`), mock fallback |
| SSR | `dynamic(() => import(...), { ssr: false })` for canvas components |

---

## 11. Implementation Guide

### 11.1 File Structure

```
src/
├── app/
│   ├── (dashboard)/graph/
│   │   └── page.tsx                  # [1] Graph page
│   └── api/graph/
│       └── route.ts                  # [2] API Route (Neo4j + mock)
├── components/graph/
│   ├── graph-canvas.tsx              # [3] ForceGraph2D wrapper
│   ├── graph-filters.tsx             # [4] Filter toggles
│   ├── graph-search.tsx              # [5] Search input
│   └── node-detail-panel.tsx         # [6] Node detail panel
├── lib/
│   ├── neo4j.ts                      # [7] Neo4j driver singleton
│   └── mock-graph.ts                 # [8] Mock graph data
└── types/
    └── graph.ts                      # [9] Type definitions
```

### 11.2 Implementation Order

1. [ ] `src/types/graph.ts` — Type definitions (GraphNode, GraphLink, GraphData, etc.)
2. [ ] `src/lib/mock-graph.ts` — Mock graph data (users + issues + labels from existing mocks)
3. [ ] `src/lib/neo4j.ts` — Neo4j driver singleton (server-only)
4. [ ] `src/app/api/graph/route.ts` — API Route (GET, mock fallback)
5. [ ] `pnpm add react-force-graph-2d` — Install graph library
6. [ ] `pnpm add neo4j-driver` — Install Neo4j driver
7. [ ] `src/components/graph/graph-canvas.tsx` — ForceGraph2D wrapper (dynamic import)
8. [ ] `src/components/graph/graph-filters.tsx` — Node/link type filter toggles
9. [ ] `src/components/graph/graph-search.tsx` — Search input with focus
10. [ ] `src/components/graph/node-detail-panel.tsx` — Node detail slide panel
11. [ ] `src/app/(dashboard)/graph/page.tsx` — Graph page (state, fetch, composition)
12. [ ] `src/components/layout/sidebar.tsx` — Add "그래프" nav item (Network icon)
13. [ ] `.env.local` — Add NEO4J_URI, NEO4J_USERNAME, NEO4J_PASSWORD (optional)

### 11.3 Mock Graph Data Structure (`src/lib/mock-graph.ts`)

Mock data derived from existing `mock-data.ts` (users) and `mock-issues.ts` (issues):

- **5 User nodes** (from mock-data users: 김민수, 이지은, 박서준, 최유리, 정하늘)
- **6 Issue nodes** (from mock-issues: issue 1-6)
- **7 Label nodes** (bug, auth, ui, responsive, feature, enhancement, darkmode)
- **5 ASSIGNED_TO links** (user → issue assignments)
- **6 CREATED_BY links** (issue → user creator)
- **10 LABELED_WITH links** (issue → label tags)

Total: **18 nodes, 21 links**

### 11.4 react-force-graph-2d Key Props

```typescript
<ForceGraph2D
  ref={graphRef}
  graphData={filteredData}           // { nodes, links }
  nodeLabel="name"                    // hover tooltip
  nodeColor={(node) => NODE_COLORS[node.type]}
  nodeRelSize={6}                     // base node size
  nodeVal={(node) => NODE_SIZES[node.type]}
  linkColor={(link) => LINK_COLORS[link.type]}
  linkDirectionalArrowLength={6}      // arrow on links
  linkDirectionalArrowRelPos={1}      // arrow at target
  linkWidth={1.5}
  onNodeClick={handleNodeClick}       // select node → detail panel
  onNodeDragEnd={handleNodeDragEnd}   // pin node
  onBackgroundClick={handleBgClick}   // deselect
  backgroundColor="transparent"       // inherit from page bg
  width={containerWidth}
  height={containerHeight}
/>
```

### 11.5 Dynamic Import Pattern

```typescript
// graph-canvas.tsx — client-only wrapper
"use client";

import dynamic from "next/dynamic";

const ForceGraph2D = dynamic(
  () => import("react-force-graph-2d").then((mod) => mod.default),
  { ssr: false }
);

export function GraphCanvas(props: GraphCanvasProps) {
  return <ForceGraph2D {...props} />;
}
```

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-15 | Initial draft | EUNA |
