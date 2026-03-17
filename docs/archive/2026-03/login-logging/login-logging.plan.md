# Login Logging - Plan Document

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem** | 로그인 시도/성공/실패를 추적할 수 없어, 오늘 2건의 로그인 시도 원인 파악 불가. Edge Function과 클라이언트 모두 로깅 부재 |
| **Solution** | 기존 activities 테이블에 로그인 이벤트 기록 + Edge Function에 구조화된 로그 추가 + 클라이언트 콜백에서 성공/실패 기록 |
| **Function UX Effect** | Dashboard 활동 피드에 "로그인 성공/실패" 이벤트가 표시되어 관리자가 실시간으로 인증 상태 파악 가능 |
| **Core Value** | 로그인 문제 즉시 진단 가능, 보안 모니터링 기반 마련, 카카오 개발모드 등 외부 원인 식별 용이 |

---

## 1. Background

- 카카오 OAuth 로그인 흐름: 클라이언트 → kauth.kakao.com → callback → Edge Function(`kakao-auth-dashboard`) → Supabase `verifyOtp`
- 현재 로그인 성공/실패 이벤트를 기록하는 곳이 **없음**
- `activities` 테이블은 이슈 CRUD만 기록 중
- Edge Function은 에러 response만 반환하고 내부 로그 없음
- 다른 사용자 로그인 실패 원인(카카오 개발모드 차단 vs Edge Function 에러 vs Supabase 에러) 구분 불가

## 2. Goal

로그인 흐름의 **3개 지점**에 로깅 추가:

1. **Edge Function** — 카카오 토큰 교환 성공/실패, 프로필 조회 성공/실패, 사용자 생성/조회 성공/실패, magiclink 생성 성공/실패
2. **클라이언트 콜백** — `verifyOtp` 성공/실패, 최종 로그인 성공 시 activities 기록
3. **Dashboard 표시** — 기존 활동 피드에 로그인 이벤트 자연스럽게 노출

## 3. Scope

### In Scope
- Edge Function 내 `console.log` 구조화 로그 (Supabase Dashboard > Edge Function Logs에서 확인)
- 클라이언트 `handleKakaoCallback` 성공 시 `logActivity` 호출
- 클라이언트 콜백 실패 시 에러 정보를 `logActivity`로 기록 (anonymous insert 필요 → 별도 API route)
- 로그인 실패 기록용 API route (`/api/auth-log`)

### Out of Scope
- 별도 `auth_logs` 테이블 (기존 activities 재활용)
- 로그인 대시보드/통계 화면
- IP 주소, User-Agent 수집 (개인정보 이슈)
- Rate limiting

## 4. Technical Approach

### 4.1 Edge Function 로깅

```
console.log(JSON.stringify({
  event: "kakao_auth",
  step: "token_exchange" | "profile_fetch" | "user_upsert" | "link_generate",
  success: boolean,
  kakao_id?: string,
  error?: string,
  timestamp: new Date().toISOString()
}))
```

→ Supabase Dashboard Edge Function Logs에서 JSON 필터로 검색 가능

### 4.2 클라이언트 로그인 성공 기록

`handleKakaoCallback` 성공 후 `logActivity(userId, userName, "로그인", "카카오 OAuth")` 호출
→ activities 테이블에 기록 → Dashboard 피드에 표시

### 4.3 로그인 실패 기록 (API Route)

실패 시에는 인증 세션이 없으므로 `logActivity`(authenticated RLS) 사용 불가.
→ `/api/auth-log` POST endpoint 생성 (service role 또는 anon insert policy 사용)
→ `{ action: "로그인 실패", target: errorMessage }` 기록

### 4.4 activities RLS 보완

현재 `activities_insert`는 `authenticated`만 허용.
로그인 실패를 기록하려면:
- **Option A**: API Route에서 Supabase service role로 insert (보안 우수)
- **Option B**: anon insert policy 추가 (간단하지만 보안 약함)
→ **Option A 채택**

## 5. Implementation Items

| # | Item | File | Description |
|---|------|------|-------------|
| 1 | Edge Function 로그 추가 | `supabase/functions/kakao-auth-dashboard/index.ts` | 4단계 구조화 console.log |
| 2 | API Route 생성 | `src/app/api/auth-log/route.ts` | 로그인 실패 기록용 POST endpoint |
| 3 | 클라이언트 성공 로깅 | `src/lib/kakao-auth.ts` | handleKakaoCallback 성공 시 logActivity |
| 4 | 클라이언트 실패 로깅 | `src/app/auth/kakao/callback/page.tsx` | 에러 발생 시 /api/auth-log 호출 |
| 5 | Dashboard layout 로깅 | `src/app/(dashboard)/layout.tsx` | 세션 획득 시 로그인 활동 기록 (선택) |

## 6. Risks

| Risk | Mitigation |
|------|-----------|
| Edge Function 로그 과다 | JSON 구조화로 필터 가능, 중요 단계만 기록 |
| /api/auth-log 남용 | rate limit 미적용이지만, insert만 하므로 위험도 낮음 |
| Service role key 노출 | API Route는 서버사이드이므로 env에서만 접근 |

## 7. Success Criteria

- [ ] Edge Function 로그에서 로그인 시도 단계별 추적 가능
- [ ] Dashboard 활동 피드에 "로그인 성공" 이벤트 표시
- [ ] 로그인 실패 시 "로그인 실패" + 에러 메시지가 activities에 기록
- [ ] 기존 기능(이슈 CRUD 로깅)에 영향 없음
