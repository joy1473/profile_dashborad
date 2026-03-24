# SaaS Dashboard

팀 협업 통합 대시보드 — Next.js 16 + TypeScript + Tailwind CSS 4

## 기능

| 메뉴 | 기능 |
|------|------|
| 일정 | 월 캘린더, 일정 CRUD, 회의 연동, 알림 |
| 입찰문서 | HWP/PDF/DOCX 분석, Key-Value 매핑, 자동 채우기 |
| 사용자 | 역할(admin/user/viewer), 상태 관리 |
| QR 명함 | 디지털 명함, QR 코드, vCard, 공개 프로필 |
| 보드 | 칸반, 캘린더, 내 할일, 실시간 동기화 |
| SW역량 | Neo4j 그래프 (G6), 스킬/프로젝트/교육/자격증 |
| 회의 | Jitsi Meet 화상회의, 카카오 초대, 대기방 |

## 기술 스택

- **Next.js 16** (App Router, Turbopack)
- **TypeScript**, **Tailwind CSS 4**
- **Supabase** (PostgreSQL, Auth, Realtime)
- **Neo4j Aura** (그래프 DB)
- **G6 AntV** (그래프 시각화)
- **Jitsi Meet** (화상회의)
- **Zustand** (상태 관리)
- **DOMPurify** (XSS 방지)

## 시작하기

```bash
pnpm install
pnpm dev
```

## 환경변수

`.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_KAKAO_REST_API_KEY=
NEXT_PUBLIC_KAKAO_JS_KEY=
NEO4J_URI=
NEO4J_USERNAME=
NEO4J_PASSWORD=
```

## 배포

Vercel에 자동 배포 (main 브랜치 push 시)

## 라이선스

© 2005-2026 조이텍
