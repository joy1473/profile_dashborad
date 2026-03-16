# Plan: Dark Mode Toggle

## Executive Summary

| Perspective | Description |
|-------------|-------------|
| **Problem** | ThemeProvider returns `null` during hydration causing FOUC; only binary light/dark with no system preference; no visual transition on theme change. |
| **Solution** | Inline script for pre-hydration theme application, 3-way toggle (light/dark/system), CSS transition for smooth theme switching. |
| **Function UX Effect** | Zero-flash theme loading, system preference auto-detection, smooth visual transitions, persistent user choice across sessions. |
| **Core Value** | Professional UX polish that eliminates visual jank and respects user accessibility preferences. |

## 1. Background

The SaaS Dashboard already has dark mode infrastructure:
- `ThemeProvider` in `src/components/layout/theme-provider.tsx` with React Context
- Toggle button (Sun/Moon icons) in `Header` component
- `dark:` Tailwind classes used across 10+ components
- CSS variables in `globals.css` with `.dark` class override
- `ThemeProvider` wraps the app in root `layout.tsx`

### Current Issues

1. **FOUC (Flash of Unstyled Content)**: ThemeProvider returns `null` until `mounted` state is `true`, causing a blank flash on initial load. The theme is applied only after hydration.
2. **No system preference option**: Only binary light/dark toggle. Users cannot opt for "follow system" preference.
3. **No transition animation**: Theme switch is instantaneous with no visual transition, causing jarring UX.

## 2. Goals

| # | Goal | Priority |
|---|------|----------|
| G1 | Eliminate FOUC with pre-hydration theme script | Must |
| G2 | Add 3-way theme selector: light / dark / system | Must |
| G3 | Smooth CSS transition on theme change | Should |
| G4 | Persist preference in localStorage | Must (already done) |
| G5 | Update Header toggle UI for 3 states | Must |

## 3. Scope

### In Scope
- Inline `<script>` in `<head>` to apply theme class before paint
- Refactor ThemeProvider to support `"light" | "dark" | "system"` modes
- Remove `if (!mounted) return null` — use inline script instead
- Update Header toggle to cycle through 3 modes (or dropdown)
- Add `transition-colors` CSS for smooth switching
- Update existing `data-testid="theme-toggle"` for E2E compatibility

### Out of Scope
- Per-page theme overrides
- Theme color customization (beyond light/dark)
- Server-side theme detection (cookies-based SSR)

## 4. Technical Approach

### 4.1 Inline Theme Script (FOUC Fix)

Add a blocking `<script>` in `layout.tsx` before `<body>` renders that:
1. Reads `localStorage.getItem("theme")`
2. If "system" or absent, checks `window.matchMedia("(prefers-color-scheme: dark)")`
3. Applies `.dark` class to `<html>` immediately

This runs synchronously before paint, eliminating any flash.

### 4.2 ThemeProvider Refactor

```
Type: "light" | "dark" | "system"
Resolved theme: "light" | "dark" (computed from mode + system preference)
```

- `mode`: What the user selected (light/dark/system)
- `resolvedTheme`: Actual applied theme (light/dark)
- Listen to `matchMedia` change event when mode is "system"
- Remove `mounted` guard — inline script handles initial state

### 4.3 Header Toggle

Replace binary Sun/Moon toggle with 3-state cycle:
- Light (Sun icon) → Dark (Moon icon) → System (Monitor icon) → Light...
- Show tooltip or label indicating current mode

### 4.4 CSS Transitions

Add to `globals.css`:
```css
html.theme-transition,
html.theme-transition * {
  transition: background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease !important;
}
```

Toggle this class during theme switch, remove after transition completes.

## 5. Affected Files

| File | Change |
|------|--------|
| `src/app/layout.tsx` | Add inline theme script |
| `src/components/layout/theme-provider.tsx` | Refactor to 3-way mode + remove mounted guard |
| `src/components/layout/header.tsx` | Update toggle UI for 3 states |
| `src/app/globals.css` | Add transition classes |

## 6. Dependencies

- No new packages required
- Uses existing: `lucide-react` (Monitor icon for system mode)

## 7. Risks

| Risk | Mitigation |
|------|------------|
| Inline script may conflict with CSP | Use `nonce` if CSP is configured (currently not) |
| System preference listener memory leak | Cleanup in useEffect return |
| SSR mismatch warnings | `suppressHydrationWarning` on `<html>` (already present) |

## 8. Success Criteria

- [ ] No FOUC on page load (dark mode user sees dark immediately)
- [ ] 3-way toggle works: light → dark → system → light
- [ ] System mode follows OS preference changes in real-time
- [ ] Theme persists across page refreshes
- [ ] Smooth visual transition on theme switch
- [ ] All existing dark: classes continue working
- [ ] E2E test `data-testid="theme-toggle"` still functional
