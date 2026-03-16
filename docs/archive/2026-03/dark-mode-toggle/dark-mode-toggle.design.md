# Design: Dark Mode Toggle

> Reference: [dark-mode-toggle.plan.md](../../01-plan/features/dark-mode-toggle.plan.md)

## 1. Implementation Order

```
1. globals.css          — Add theme transition CSS
2. layout.tsx           — Add inline theme script in <head>
3. theme-provider.tsx   — Refactor to 3-way mode (light/dark/system)
4. header.tsx           — Update toggle for 3-state cycle
```

## 2. Component Design

### 2.1 Inline Theme Script (`layout.tsx`)

A synchronous `<script>` placed inside `<head>` (before body paint) to prevent FOUC.

```tsx
// In RootLayout, inside <html> before <body>:
<script dangerouslySetInnerHTML={{ __html: `
  (function() {
    var mode = localStorage.getItem("theme") || "system";
    var dark = mode === "dark" ||
      (mode === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    if (dark) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  })();
` }} />
```

**Key decisions:**
- Uses `dangerouslySetInnerHTML` for inline script (Next.js pattern)
- Reads `localStorage.getItem("theme")` — key remains `"theme"` for backward compatibility
- Default mode is `"system"` (was `"light"` before — now respects OS preference)
- `suppressHydrationWarning` already on `<html>` tag

### 2.2 ThemeProvider Refactor (`theme-provider.tsx`)

```typescript
// Types
type ThemeMode = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";

// Context shape
interface ThemeContextValue {
  mode: ThemeMode;          // User selection: light | dark | system
  resolvedTheme: ResolvedTheme;  // Actual applied theme
  setMode: (mode: ThemeMode) => void;
}
```

**State management:**
```
mode (from localStorage, default "system")
  ↓
resolvedTheme = mode === "system"
  ? matchMedia result
  : mode
  ↓
document.documentElement.classList.toggle("dark", resolvedTheme === "dark")
```

**System preference listener:**
- When `mode === "system"`, add `matchMedia("(prefers-color-scheme: dark)")` change listener
- On change, update `resolvedTheme` and toggle `.dark` class
- Cleanup listener on mode change or unmount

**FOUC fix:**
- Remove `if (!mounted) return null` — inline script handles initial paint
- Children render immediately — no blank flash
- `useState` initializer reads from `localStorage` directly (SSR returns "system" default, client reads actual value)

**Exported hooks:**
```typescript
export function useTheme(): ThemeContextValue;
```

### 2.3 Header Toggle (`header.tsx`)

**3-state cycle:** Light → Dark → System → Light

```
Current Mode    Icon        Click → Next
─────────────────────────────────────────
light           Sun         → dark
dark            Moon        → system
system          Monitor     → light
```

**Icon imports from lucide-react:**
- `Sun` — light mode (already imported)
- `Moon` — dark mode (already imported)
- `Monitor` — system mode (new import)

**Toggle button:**
```tsx
<button
  onClick={() => {
    const next = mode === "light" ? "dark" : mode === "dark" ? "system" : "light";
    setMode(next);
  }}
  className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
  data-testid="theme-toggle"
  title={mode === "light" ? "라이트 모드" : mode === "dark" ? "다크 모드" : "시스템 모드"}
>
  {mode === "light" && <Sun size={18} />}
  {mode === "dark" && <Moon size={18} />}
  {mode === "system" && <Monitor size={18} />}
</button>
```

**Breaking change for Header:**
- Replace `const { theme, toggleTheme } = useTheme()` with `const { mode, setMode } = useTheme()`
- The `theme` / `toggleTheme` API is removed

### 2.4 Theme Transition CSS (`globals.css`)

```css
html.theme-transition,
html.theme-transition *,
html.theme-transition *::before,
html.theme-transition *::after {
  transition: background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease !important;
}
```

**Application strategy:**
- ThemeProvider adds `theme-transition` class to `<html>` before toggling theme
- Removes it after 200ms via `setTimeout`
- This avoids transition on initial page load (only on user toggle)

## 3. Data Flow

```
Initial Load:
  inline script → read localStorage → apply .dark class → no FOUC

Hydration:
  ThemeProvider mounts → reads localStorage → sets mode state
  → resolvedTheme computed → classList already correct (no flash)

User Toggle:
  click → setMode(next) → localStorage.setItem("theme", next)
  → add .theme-transition → toggle .dark class → remove .theme-transition after 200ms

System Change (when mode === "system"):
  OS preference changes → matchMedia listener fires
  → resolvedTheme updates → toggle .dark class
```

## 4. localStorage Schema

| Key | Value | Default |
|-----|-------|---------|
| `theme` | `"light"` \| `"dark"` \| `"system"` | `"system"` |

**Migration:** Previous values were `"light"` or `"dark"` — both remain valid. New `"system"` option is the new default when no stored value exists.

## 5. Test Considerations

- `data-testid="theme-toggle"` preserved on button
- E2E tests can verify icon changes after click
- `document.documentElement.classList.contains("dark")` verifiable in tests
- Existing E2E dashboard test navigates via sidebar — theme toggle doesn't affect navigation tests

## 6. Edge Cases

| Case | Behavior |
|------|----------|
| No localStorage (first visit) | Default to "system", follow OS preference |
| Invalid localStorage value | Treat as "system" |
| OS has no color-scheme preference | Default to light |
| SSR render | Inline script runs before paint, no mismatch |
| Multiple tabs | Each tab reads localStorage independently; no cross-tab sync needed |
