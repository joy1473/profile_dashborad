# SaaS Dashboard

데이터 시각화 및 관리 대시보드 — Next.js 15 + TypeScript + Tailwind CSS 4

## 기술 스택

- **Next.js 15** (App Router, Turbopack)
- **TypeScript**
- **Tailwind CSS 4**
- **Recharts** — 차트 시각화
- **Zustand** — 상태 관리
- **Lucide React** — 아이콘
- **Playwright** — E2E 테스트

## 페이지 구성

| 경로 | 설명 |
|------|------|
| `/dashboard` | 메트릭 카드, 매출/트래픽 차트, 최근 활동 |
| `/analytics` | 월별 매출 비교(바 차트), 사용자 증가 추이(영역 차트) |
| `/users` | 사용자 목록, 역할/상태 뱃지, 활성/비활성 필터 |
| `/settings` | 프로필 편집, 알림 토글 설정 |

## 시작하기

```bash
pnpm install
pnpm dev
```

http://localhost:3000 에서 확인

## 빌드

```bash
pnpm build
pnpm start
```

## 테스트

```bash
# Playwright 브라우저 설치 (최초 1회)
npx playwright install chromium

# E2E 테스트 실행
npx playwright test

# UI 모드로 실행
npx playwright test --ui
```

## 프로젝트 구조

```
src/
├── app/
│   ├── (dashboard)/
│   │   ├── dashboard/page.tsx
│   │   ├── analytics/page.tsx
│   │   ├── users/page.tsx
│   │   ├── settings/page.tsx
│   │   └── layout.tsx
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── charts/
│   ├── layout/
│   └── ui/
├── lib/
├── store/
└── types/
e2e/
└── dashboard.spec.ts
```

## 배포

```bash
vercel
```
