# reusable-error-boundary Design

> **Status**: Draft
>
> **Project**: saas-dashboard
> **Version**: 0.1.0
> **Author**: EUNA
> **Created**: 2026-03-15
> **Plan Reference**: [reusable-error-boundary.plan.md](../../01-plan/features/reusable-error-boundary.plan.md)

---

## 1. Architecture Overview

### 1.1 Component Diagram

```
┌─────────────────────────────────────────────────────────┐
│  src/components/ui/error-boundary.tsx                    │
│                                                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │  ErrorBoundary (class component)                  │  │
│  │                                                   │  │
│  │  Props:                                           │  │
│  │    children: ReactNode                            │  │
│  │    fallback?: ReactNode | FallbackRender          │  │
│  │    onError?: (error, errorInfo) => void           │  │
│  │                                                   │  │
│  │  State:                                           │  │
│  │    hasError: boolean                              │  │
│  │    error: Error | null                            │  │
│  │                                                   │  │
│  │  Methods:                                         │  │
│  │    getDerivedStateFromError() → set hasError      │  │
│  │    componentDidCatch() → call onError             │  │
│  │    reset() → clear error state                    │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│  Exports:                                               │
│    ErrorBoundary (default + named)                      │
│    FallbackRender (type)                                │
│    ErrorBoundaryProps (type)                             │
└─────────────────────────────────────────────────────────┘

Usage in consumers:
┌──────────────────────────────┐
│  graph-canvas.tsx            │
│                              │
│  <ErrorBoundary              │
│    fallback={                │
│      <div>그래프 렌더링에    │
│      실패했습니다...</div>   │
│    }                         │
│    onError={console.error}   │
│  >                           │
│    <ForceGraph2D ... />      │
│  </ErrorBoundary>            │
└──────────────────────────────┘
```

---

## 2. Type Definitions

### 2.1 Types (in `src/components/ui/error-boundary.tsx`)

```typescript
import { Component } from "react";
import type { ReactNode, ErrorInfo } from "react";

/**
 * Render function for custom fallback UI.
 * Receives the caught error and a reset function to retry.
 */
export type FallbackRender = (error: Error, reset: () => void) => ReactNode;

export interface ErrorBoundaryProps {
  children: ReactNode;
  /** Static fallback UI or render function with error + reset */
  fallback?: ReactNode | FallbackRender;
  /** Called when an error is caught (for logging) */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}
```

---

## 3. Core Implementation

### 3.1 File: `src/components/ui/error-boundary.tsx`

```typescript
"use client";

import { Component } from "react";
import type { ReactNode, ErrorInfo } from "react";

export type FallbackRender = (error: Error, reset: () => void) => ReactNode;

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode | FallbackRender;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.props.onError?.(error, errorInfo);
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      const { fallback } = this.props;

      // Render function fallback (with error + reset)
      if (typeof fallback === "function") {
        return fallback(this.state.error, this.reset);
      }

      // Static ReactNode fallback
      if (fallback) {
        return fallback;
      }

      // Default fallback
      return (
        <div className="flex h-full items-center justify-center p-8 text-sm text-zinc-400">
          문제가 발생했습니다. 페이지를 새로고침해주세요.
        </div>
      );
    }

    return this.props.children;
  }
}
```

### 3.2 Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| `"use client"` directive | Class components only work in client context |
| `fallback` overload (ReactNode or function) | Simple cases use static JSX; advanced cases get error + reset |
| `reset` as arrow method | Stable reference, no bind needed |
| Default fallback in Korean | Matches project language convention |
| `error` stored in state | Available to render-function fallback |
| Types exported | Consumers can import `FallbackRender` for typed render props |
| `ErrorBoundaryState` not exported | Internal implementation detail |

---

## 4. Refactored Consumer

### 4.1 File: `src/components/graph/graph-canvas.tsx` (After Refactor)

**Remove** (lines 2, 6, 13-45): `Component` import, `ErrorInfo` import type, entire `GraphErrorBoundary` class.

**Add** import:
```typescript
import { ErrorBoundary } from "@/components/ui/error-boundary";
```

**Replace** `<GraphErrorBoundary>` wrapper with:
```tsx
<ErrorBoundary
  fallback={
    <div className="flex h-full items-center justify-center text-sm text-zinc-400">
      그래프 렌더링에 실패했습니다. 페이지를 새로고침해주세요.
    </div>
  }
  onError={(error, info) => console.error("GraphCanvas render error:", error, info)}
>
  <ForceGraph2D ... />
</ErrorBoundary>
```

### 4.2 Changes Summary

| Change | Before | After |
|--------|--------|-------|
| ErrorBoundary source | Inline class (30 lines) | Import from `@/components/ui/error-boundary` |
| `Component` import | `import { Component, useRef, ... }` | `import { useRef, ... }` |
| `ErrorInfo` import | `import type { ReactNode, ErrorInfo }` | `import type { ReactNode }` (ErrorInfo removed) |
| Wrapper tag | `<GraphErrorBoundary>` | `<ErrorBoundary fallback={...} onError={...}>` |
| Error logging | Inside class `componentDidCatch` | Via `onError` prop |
| Lines removed | ~30 lines | 0 (net reduction ~25 lines) |

---

## 5. File Structure

```
src/
├── components/
│   ├── ui/
│   │   ├── card.tsx
│   │   ├── toast.tsx
│   │   └── error-boundary.tsx     ← NEW
│   └── graph/
│       └── graph-canvas.tsx       ← MODIFIED (remove inline ErrorBoundary)
```

---

## 6. Implementation Order

| Step | File | Action | Est. |
|:----:|------|--------|:----:|
| 1 | `src/components/ui/error-boundary.tsx` | Create shared ErrorBoundary component | 10 min |
| 2 | `src/components/graph/graph-canvas.tsx` | Remove inline ErrorBoundary, import shared | 5 min |
| 3 | Build & Lint verification | `pnpm build && pnpm lint` | 5 min |

---

## 7. Conventions

| Convention | Value |
|------------|-------|
| File naming | kebab-case (`error-boundary.tsx`) |
| Component naming | PascalCase (`ErrorBoundary`) |
| Type naming | PascalCase (`FallbackRender`, `ErrorBoundaryProps`) |
| Export style | Named export (class) + type exports |
| `"use client"` | Required (class component) |
| Default fallback language | Korean (project convention) |

---

## 8. Testing Criteria

| Test Case | Expected Result |
|-----------|-----------------|
| Graph page loads normally | Graph renders, no ErrorBoundary visible |
| Graph canvas throws render error | Fallback message displayed, no page crash |
| `pnpm build` | SUCCESS |
| `pnpm lint` | 0 new errors |
| ErrorBoundary with no `fallback` prop | Shows default Korean message |
| ErrorBoundary with static `fallback` | Shows custom static JSX |
| ErrorBoundary with render function `fallback` | Receives error + reset function |

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-03-15 | Initial design | EUNA |
