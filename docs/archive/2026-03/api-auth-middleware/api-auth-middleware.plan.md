# api-auth-middleware Plan

> **Status**: Draft
>
> **Project**: saas-dashboard
> **Version**: 0.1.0
> **Author**: EUNA
> **Created**: 2026-03-15
> **Level**: Dynamic

---

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem** | Each API route manually duplicates Supabase auth check logic (8 lines per route), creating risk of auth gaps when new routes are added — as caught by neo4j-graph gap analysis |
| **Solution** | Create a reusable `withAuth` higher-order function that wraps API route handlers, extracting session validation into a single shared utility |
| **Function/UX Effect** | API routes reduce from ~12 lines of auth boilerplate to 1-line `withAuth(handler)` wrapper; session/user object automatically injected into handler context |
| **Core Value** | Eliminates class of security bugs (missing auth) by making authenticated routes the default pattern — auth is opt-in to skip, not opt-in to add |

---

## 1. Background & Motivation

### 1.1 Problem Statement

Currently, the `/api/graph` route contains an inline auth check pattern:

```typescript
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (supabaseUrl && supabaseKey) {
  const supabase = createClient(supabaseUrl, supabaseKey, {
    global: { headers: { cookie: request.headers.get("cookie") ?? "" } },
  });
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
```

This pattern must be manually copied into every new API route. The neo4j-graph PDCA gap analysis revealed this was initially **missing** — a HIGH severity security gap. As more API routes are added, the probability of forgetting auth increases.

### 1.2 Origin

- **neo4j-graph Lessons Learned** (Section 6.3): "Create a shared API auth middleware utility for all `/api/*` routes"
- **neo4j-graph Report** (Section 7.1): "Add auth check to API Route template"
- Priority: **HIGH**

### 1.3 Expected Outcomes

| Outcome | Metric |
|---------|--------|
| Auth boilerplate reduction | 8 lines → 1 line per route |
| Security gap prevention | 0 missed auth checks in future routes |
| Consistent error response | All routes return same 401 JSON shape |
| Developer experience | Typed `session` and `user` available in handler params |

---

## 2. Scope

### 2.1 In Scope

| Item | Description |
|------|-------------|
| `withAuth` HOF | Higher-order function wrapping Next.js API route handlers |
| Server-side Supabase client | Create Supabase client from request cookies in API context |
| Session injection | Pass `session` and `user` to wrapped handler |
| 401 response | Consistent `{ error: "Unauthorized" }` with 401 status |
| Refactor `/api/graph` | Replace inline auth with `withAuth` wrapper |
| Type definitions | `AuthenticatedHandler`, `AuthContext` types |

### 2.2 Out of Scope

| Item | Reason |
|------|--------|
| Role-based access control (RBAC) | Not needed yet — all routes require same auth level |
| Rate limiting | Separate concern, separate feature |
| Next.js middleware.ts | Route-level middleware is heavier; HOF pattern is simpler for API routes |
| Client-side auth changes | Auth provider/guard already works; this is server-side API only |

---

## 3. Technical Approach

### 3.1 Architecture Decision

**Pattern: Higher-Order Function (HOF)** over Next.js Middleware

| Option | Pros | Cons |
|--------|------|------|
| **HOF `withAuth(handler)`** | Type-safe, composable, per-route control, session injected into handler | Must wrap each handler explicitly |
| Next.js middleware.ts | Runs before all matching routes automatically | No access to session inside handler, harder to type, global scope |
| Supabase SSR `createServerClient` | Official pattern | Requires `@supabase/ssr` package addition |

**Decision**: HOF pattern — lightweight, type-safe, explicit, and consistent with Next.js App Router API route conventions. No new dependencies.

### 3.2 API Design

```typescript
// Usage in API route
export const GET = withAuth(async (request, { session, user }) => {
  // session and user are guaranteed non-null
  return NextResponse.json({ data: "protected" });
});

// Optional: public route with optional auth
export const GET = withOptionalAuth(async (request, { session, user }) => {
  // session may be null
});
```

### 3.3 Implementation Files

| File | Purpose | Type |
|------|---------|------|
| `src/lib/api-auth.ts` | `withAuth`, `withOptionalAuth`, `createServerSupabase` | New |
| `src/types/api.ts` | `AuthContext`, `AuthenticatedHandler` types | New |
| `src/app/api/graph/route.ts` | Refactor to use `withAuth` | Modified |

### 3.4 Key Design Decisions

1. **Graceful fallback when Supabase not configured**: If `NEXT_PUBLIC_SUPABASE_URL` is not set, `withAuth` passes `null` session (dev mode) — same behavior as current inline pattern
2. **Cookie-based auth**: Create Supabase client from `request.headers.get("cookie")` — same proven pattern from `/api/graph`
3. **No new dependencies**: Uses existing `@supabase/supabase-js` only

---

## 4. Dependencies

### 4.1 Package Dependencies

None — uses existing `@supabase/supabase-js@^2.99.1`.

### 4.2 Internal Dependencies

| Dependency | Status |
|------------|--------|
| `src/lib/supabase.ts` | Exists (client-side singleton) |
| `/api/graph/route.ts` | Exists (refactor target) |

---

## 5. Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|:-----------:|:------:|------------|
| Breaking `/api/graph` during refactor | Low | Medium | Test before and after refactor |
| Session extraction differs between routes | Low | Low | Single `createServerSupabase` function |
| Dev mode without Supabase breaks | Medium | Low | Graceful null fallback (existing pattern) |

---

## 6. Success Criteria

| Criteria | Target |
|----------|--------|
| `/api/graph` works identically after refactor | Pass |
| `withAuth` returns 401 when no session | Pass |
| `withAuth` passes session/user to handler when authenticated | Pass |
| `pnpm build` succeeds | Pass |
| `pnpm lint` — 0 new errors | Pass |
| Auth boilerplate in `/api/graph` reduced | < 3 lines |

---

## 7. Timeline

| Phase | Estimated Effort |
|-------|-----------------|
| Design | 15 min |
| Implementation | 30 min |
| Refactor + Test | 15 min |
| **Total** | **~1 hour** |

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-03-15 | Initial plan | EUNA |
