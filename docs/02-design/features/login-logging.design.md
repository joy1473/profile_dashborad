# Login Logging - Design Document

## 1. Overview

로그인 흐름 3개 지점에 로깅 추가. 기존 activities 테이블 재활용.

## 2. Implementation Order

| Step | File | Description |
|------|------|-------------|
| 1 | `supabase/functions/kakao-auth-dashboard/index.ts` | 4단계 구조화 console.log 추가 |
| 2 | `src/app/api/auth-log/route.ts` | 로그인 실패 기록 API (service role insert) |
| 3 | `src/lib/kakao-auth.ts` | 성공 시 logActivity, 실패 시 /api/auth-log 호출 |
| 4 | `src/app/auth/kakao/callback/page.tsx` | 에러 시 /api/auth-log 호출 |

## 3. Edge Function Log Format

```json
{ "event": "kakao_auth", "step": "token_exchange|profile|user_upsert|link", "success": true, "kakao_id": "123", "error": null }
```

## 4. API Route Spec

- `POST /api/auth-log`
- Body: `{ action: string, target: string }`
- Supabase service role로 activities insert (RLS bypass)
- 응답: `{ ok: true }`
