# reusable-error-boundary Plan

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
| **Problem** | ErrorBoundary is written inline in graph-canvas.tsx (30 lines) — not reusable, must be copy-pasted for each new feature that needs render error protection |
| **Solution** | Extract a generic `ErrorBoundary` class component to `src/components/ui/error-boundary.tsx` with customizable fallback UI via props |
| **Function/UX Effect** | Any component can be wrapped with `<ErrorBoundary fallback={...}>` for render safety; graph-canvas.tsx reduces by ~30 lines; consistent error UX across features |
| **Core Value** | Prevents cascading render crashes from propagating to the full page — one broken component doesn't take down the entire dashboard |

---

## 1. Background & Motivation

### 1.1 Problem Statement

The `GraphErrorBoundary` in `src/components/graph/graph-canvas.tsx` (lines 14-45) is:
- **Hardcoded** — Korean fallback message specific to graph
- **Not reusable** — class component defined inline, not exported
- **Must be duplicated** for every feature needing error protection (charts, board, future features)

React Error Boundaries must be class components (no hooks equivalent). Having a single shared version eliminates repeated boilerplate.

### 1.2 Origin

- **neo4j-graph Lessons Learned** (Section 6.2): "ErrorBoundary should be a reusable utility component, not written inline per feature"
- **neo4j-graph Report** (Section 6.3): "Extract ErrorBoundary to `src/components/ui/error-boundary.tsx` for reuse"
- Priority: **MEDIUM**

### 1.3 Expected Outcomes

| Outcome | Metric |
|---------|--------|
| Reusable ErrorBoundary | 1 shared component |
| graph-canvas.tsx simplification | Remove ~30 lines of inline ErrorBoundary |
| Adoption candidates | graph-canvas, kanban-board, charts (3+ components) |
| Consistent error UX | Single fallback pattern across all features |

---

## 2. Scope

### 2.1 In Scope

| Item | Description |
|------|-------------|
| `ErrorBoundary` component | Generic class component with `fallback` prop |
| Default fallback UI | Centered error message with optional retry button |
| `onError` callback prop | Optional error logging hook |
| Refactor graph-canvas.tsx | Replace inline `GraphErrorBoundary` with shared component |
| TypeScript types | `ErrorBoundaryProps`, `ErrorBoundaryState` |

### 2.2 Out of Scope

| Item | Reason |
|------|--------|
| Wrapping all components with ErrorBoundary | Only refactor graph-canvas now; others adopt organically |
| Error reporting service (Sentry, etc.) | Not set up in this project |
| Suspense/fallback integration | Separate concern; ErrorBoundary is for render errors only |

---

## 3. Technical Approach

### 3.1 Component API

```tsx
// Basic usage
<ErrorBoundary>
  <RiskyComponent />
</ErrorBoundary>

// Custom fallback
<ErrorBoundary fallback={<div>Something went wrong</div>}>
  <RiskyComponent />
</ErrorBoundary>

// Render prop fallback (with retry)
<ErrorBoundary
  fallback={(error, reset) => (
    <div>
      <p>Error: {error.message}</p>
      <button onClick={reset}>Retry</button>
    </div>
  )}
>
  <RiskyComponent />
</ErrorBoundary>

// Error callback
<ErrorBoundary onError={(error, info) => console.error(error, info)}>
  <RiskyComponent />
</ErrorBoundary>
```

### 3.2 Implementation Files

| File | Purpose | Type |
|------|---------|------|
| `src/components/ui/error-boundary.tsx` | Shared ErrorBoundary component | New |
| `src/components/graph/graph-canvas.tsx` | Remove inline ErrorBoundary, use shared | Modified |

### 3.3 Key Design Decisions

1. **Class component** — React requirement, no hooks alternative for error boundaries
2. **`fallback` prop overload** — accepts ReactNode (static) or render function (dynamic with error + reset)
3. **`reset` method** — sets `hasError: false` to allow retry without page reload
4. **Default fallback** — generic Korean/English message with project styling (dark mode support)
5. **No new dependencies** — pure React class component

---

## 4. Dependencies

None — uses React built-ins only.

---

## 5. Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|:-----------:|:------:|------------|
| Breaking graph ErrorBoundary during refactor | Low | Medium | Test graph page before/after |
| Class component complexity | Low | Low | Well-documented API, minimal surface |

---

## 6. Success Criteria

| Criteria | Target |
|----------|--------|
| Shared ErrorBoundary exported from `ui/error-boundary.tsx` | Pass |
| graph-canvas.tsx uses shared component | Pass |
| Inline `GraphErrorBoundary` removed from graph-canvas.tsx | Pass |
| Graph page works identically after refactor | Pass |
| `pnpm build` succeeds | Pass |
| `pnpm lint` — 0 new errors | Pass |

---

## 7. Timeline

| Phase | Estimated Effort |
|-------|-----------------|
| Design | 10 min |
| Implementation | 15 min |
| Refactor + Verify | 10 min |
| **Total** | **~35 min** |

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-03-15 | Initial plan | EUNA |
