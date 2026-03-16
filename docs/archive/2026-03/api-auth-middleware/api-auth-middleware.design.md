# api-auth-middleware Design

> **Status**: Draft
>
> **Project**: saas-dashboard
> **Version**: 0.1.0
> **Author**: EUNA
> **Created**: 2026-03-15
> **Plan Reference**: [api-auth-middleware.plan.md](../../01-plan/features/api-auth-middleware.plan.md)

---

## 1. Architecture Overview

### 1.1 Component Diagram

```
┌─────────────────────────────────────────────────────────┐
│  API Route Layer                                        │
│                                                         │
│  ┌──────────────────┐    ┌──────────────────────────┐   │
│  │ /api/graph        │    │ /api/future-routes       │   │
│  │  export const GET │    │  export const GET/POST   │   │
│  │    = withAuth(..) │    │    = withAuth(..)        │   │
│  └────────┬─────────┘    └────────────┬─────────────┘   │
│           │                           │                  │
│           └───────────┬───────────────┘                  │
│                       ▼                                  │
│  ┌────────────────────────────────────────────────────┐  │
│  │  src/lib/api-auth.ts                               │  │
│  │                                                    │  │
│  │  withAuth(handler)        withOptionalAuth(handler)│  │
│  │       │                          │                 │  │
│  │       └──────────┬───────────────┘                 │  │
│  │                  ▼                                 │  │
│  │    createServerSupabase(request)                   │  │
│  │                  │                                 │  │
│  │                  ▼                                 │  │
│  │    session = supabase.auth.getSession()            │  │
│  │       │                                            │  │
│  │       ├── session exists → handler({ session, user }) │
│  │       └── no session → 401 Unauthorized            │  │
│  └────────────────────────────────────────────────────┘  │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │  src/types/api.ts                                 │   │
│  │  AuthContext, AuthenticatedHandler,               │   │
│  │  OptionalAuthContext, OptionalAuthHandler         │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### 1.2 Data Flow

```
Request → withAuth → createServerSupabase(req.cookie)
                        │
                        ├── Supabase not configured (no env vars)
                        │     → handler({ session: null, user: null })
                        │       (dev mode passthrough)
                        │
                        ├── Supabase configured, valid session
                        │     → handler({ session, user })
                        │
                        └── Supabase configured, no session
                              → NextResponse.json({ error: "Unauthorized" }, 401)
```

---

## 2. Type Definitions

### 2.1 File: `src/types/api.ts`

```typescript
import type { Session, User } from "@supabase/supabase-js";

/**
 * Auth context injected into authenticated API handlers.
 * session and user are guaranteed non-null.
 */
export interface AuthContext {
  session: Session;
  user: User;
}

/**
 * Auth context for optional auth routes.
 * session and user may be null.
 */
export interface OptionalAuthContext {
  session: Session | null;
  user: User | null;
}

/**
 * Handler function type for routes that require authentication.
 */
export type AuthenticatedHandler = (
  request: Request,
  context: AuthContext
) => Promise<Response>;

/**
 * Handler function type for routes with optional authentication.
 */
export type OptionalAuthHandler = (
  request: Request,
  context: OptionalAuthContext
) => Promise<Response>;
```

---

## 3. Core Implementation

### 3.1 File: `src/lib/api-auth.ts`

```typescript
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type {
  AuthenticatedHandler,
  OptionalAuthHandler,
  AuthContext,
  OptionalAuthContext,
} from "@/types/api";

/**
 * Create a Supabase client from request cookies (server-side).
 * Returns null if Supabase env vars are not configured.
 */
function createServerSupabase(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) return null;

  return createClient(url, key, {
    global: {
      headers: { cookie: request.headers.get("cookie") ?? "" },
    },
  });
}

/**
 * Higher-order function that wraps an API route handler with auth.
 * Returns 401 if no valid session exists.
 *
 * Usage:
 *   export const GET = withAuth(async (request, { session, user }) => {
 *     return NextResponse.json({ userId: user.id });
 *   });
 */
export function withAuth(handler: AuthenticatedHandler) {
  return async (request: Request): Promise<Response> => {
    const supabase = createServerSupabase(request);

    if (!supabase) {
      // Dev mode: Supabase not configured, pass null context
      // This matches existing fallback behavior
      return handler(request, {
        session: null as unknown as AuthContext["session"],
        user: null as unknown as AuthContext["user"],
      });
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return handler(request, { session, user: session.user });
  };
}

/**
 * Higher-order function for routes with optional authentication.
 * Does not return 401 — passes null session/user if unauthenticated.
 *
 * Usage:
 *   export const GET = withOptionalAuth(async (request, { session, user }) => {
 *     const isLoggedIn = !!session;
 *     return NextResponse.json({ public: true, isLoggedIn });
 *   });
 */
export function withOptionalAuth(handler: OptionalAuthHandler) {
  return async (request: Request): Promise<Response> => {
    const supabase = createServerSupabase(request);

    if (!supabase) {
      return handler(request, { session: null, user: null });
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    return handler(request, {
      session,
      user: session?.user ?? null,
    });
  };
}
```

### 3.2 Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| `createServerSupabase` is private (not exported) | Only `withAuth`/`withOptionalAuth` should create server clients — prevents misuse |
| Dev mode passthrough (no Supabase env) | Matches existing `/api/graph` behavior — no breaking change |
| `withAuth` casts null in dev mode | Type safety in production; flexibility in development |
| `withOptionalAuth` separate function | Explicit intent — never accidentally leave a route unprotected |
| No `@supabase/ssr` dependency | Existing `createClient` + cookie header pattern works; avoid new dependency |

---

## 4. Refactored API Route

### 4.1 File: `src/app/api/graph/route.ts` (After Refactor)

```typescript
import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api-auth";
import { getDriver } from "@/lib/neo4j";
import { mockGraphData } from "@/lib/mock-graph";
import type { GraphData, GraphNode, GraphLink } from "@/types/graph";

export const GET = withAuth(async (request, { session, user }) => {
  const driver = getDriver();

  if (!driver) {
    return NextResponse.json(mockGraphData);
  }

  const dbSession = driver.session();
  try {
    const result = await dbSession.run(`
      MATCH (n)
      OPTIONAL MATCH (n)-[r]->(m)
      RETURN n, labels(n) AS nLabels, r, type(r) AS rType, m, labels(m) AS mLabels
    `);

    const nodesMap = new Map<string, GraphNode>();
    const links: GraphLink[] = [];

    for (const record of result.records) {
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
    await dbSession.close();
  }
});
```

### 4.2 Changes from Current Version

| Change | Before | After |
|--------|--------|-------|
| Auth check | 8-line inline block | `withAuth()` wrapper |
| Session variable | `session` (name conflict with Neo4j) | Auth: injected via context; Neo4j: `dbSession` |
| Import | `createClient` from supabase | `withAuth` from `@/lib/api-auth` |
| Handler export | `export async function GET` | `export const GET = withAuth(...)` |

---

## 5. File Structure

```
src/
├── types/
│   └── api.ts                    ← NEW: AuthContext, AuthenticatedHandler types
├── lib/
│   └── api-auth.ts               ← NEW: withAuth, withOptionalAuth, createServerSupabase
└── app/
    └── api/
        └── graph/
            └── route.ts          ← MODIFIED: refactored to use withAuth
```

---

## 6. Error Responses

### 6.1 Standard Error Shape

All auth-related errors use consistent JSON shape:

| Status | Body | Condition |
|:------:|------|-----------|
| 401 | `{ "error": "Unauthorized" }` | No valid session (Supabase configured) |

### 6.2 Non-Error Cases

| Condition | Behavior |
|-----------|----------|
| Supabase not configured (dev mode) | Handler called with null session/user |
| Valid session | Handler called with session + user |

---

## 7. Implementation Order

| Step | File | Action | Est. |
|:----:|------|--------|:----:|
| 1 | `src/types/api.ts` | Create type definitions | 5 min |
| 2 | `src/lib/api-auth.ts` | Create `withAuth`, `withOptionalAuth`, `createServerSupabase` | 10 min |
| 3 | `src/app/api/graph/route.ts` | Refactor to use `withAuth` | 5 min |
| 4 | Build & Lint verification | `pnpm build && pnpm lint` | 5 min |

---

## 8. Conventions

| Convention | Value |
|------------|-------|
| File naming | kebab-case (`api-auth.ts`) |
| Type naming | PascalCase (`AuthContext`) |
| Function naming | camelCase (`withAuth`, `createServerSupabase`) |
| Export style | Named exports only |
| Import alias | `@/lib/api-auth`, `@/types/api` |
| Handler export | `export const GET = withAuth(...)` |

---

## 9. Testing Criteria

| Test Case | Expected Result |
|-----------|-----------------|
| `/api/graph` with valid session cookie | 200 + graph data |
| `/api/graph` without session cookie (Supabase configured) | 401 + `{ error: "Unauthorized" }` |
| `/api/graph` without Supabase env vars | 200 + mock data (dev fallback) |
| `pnpm build` | SUCCESS |
| `pnpm lint` | 0 new errors |

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-03-15 | Initial design | EUNA |
