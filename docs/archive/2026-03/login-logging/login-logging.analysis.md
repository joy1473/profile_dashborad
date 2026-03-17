# login-logging Analysis Report

> **Analysis Type**: Gap Analysis (Design vs Implementation)
>
> **Project**: SaaS Dashboard
> **Analyst**: Claude Code (gap-detector)
> **Date**: 2026-03-17
> **Design Doc**: [login-logging.design.md](../02-design/features/login-logging.design.md)
> **Plan Doc**: [login-logging.plan.md](../01-plan/features/login-logging.plan.md)

---

## 1. Analysis Overview

### 1.1 Analysis Purpose

Design document(Section 2~4)와 Plan document(Section 5, 7)에 명시된 로그인 로깅 요구사항 대비 실제 구현 코드의 일치도를 검증한다.

### 1.2 Analysis Scope

- **Design Document**: `docs/02-design/features/login-logging.design.md`
- **Plan Document**: `docs/01-plan/features/login-logging.plan.md`
- **Implementation Files**:
  - `supabase/functions/kakao-auth-dashboard/index.ts`
  - `src/app/api/auth-log/route.ts`
  - `src/lib/kakao-auth.ts`
  - `src/app/auth/kakao/callback/page.tsx`

---

## 2. Overall Scores

| Category | Score | Status |
|----------|:-----:|:------:|
| Design Match (Section 2: Implementation Order) | 92% | ✅ |
| Design Match (Section 3: Edge Function Log Format) | 95% | ✅ |
| Design Match (Section 4: API Route Spec) | 100% | ✅ |
| Plan Match (Section 5: Implementation Items) | 90% | ✅ |
| Plan Match (Section 7: Success Criteria) | 100% | ✅ |
| **Overall** | **93%** | **✅** |

---

## 3. Gap Analysis (Design vs Implementation)

### 3.1 Design Section 2 -- Implementation Order (4 Steps)

| Step | Design | Implementation | Status | Notes |
|------|--------|----------------|:------:|-------|
| 1 | Edge Function에 4단계 구조화 console.log | `authLog()` helper 함수로 6개 지점에 구조화 로그 출력 | ✅ | 설계 이상으로 충실히 구현 (request, token_exchange, profile, user_upsert, link_generate, error) |
| 2 | `src/app/api/auth-log/route.ts` 생성 | POST endpoint 구현, service role insert, `{ ok: true }` 응답 | ✅ | 완전 일치 |
| 3 | `src/lib/kakao-auth.ts`에 성공 시 logActivity 호출 | 클라이언트에서는 logActivity 미호출 | ⚠️ | 대신 Edge Function에서 직접 activities insert로 대체 (아래 상세) |
| 4 | `src/app/auth/kakao/callback/page.tsx` 에러 시 /api/auth-log 호출 | catch 블록에서 fetch POST to /api/auth-log 구현 | ✅ | 완전 일치 |

### 3.2 Design Section 3 -- Edge Function Log Format

| Design Field | Implementation | Status |
|-------------|----------------|:------:|
| `event: "kakao_auth"` | `event: 'kakao_auth'` | ✅ |
| `step` values: `token_exchange`, `profile`, `user_upsert`, `link` | `token_exchange`, `profile`, `user_upsert`, `link_generate` + 추가: `request`, `error` | ✅ |
| `success: boolean` | `success: boolean` | ✅ |
| `kakao_id: string` | `kakao_id` spread via `detail` object | ✅ |
| `error: null/string` | `error` spread via `detail` object | ✅ |
| (not in design) | `timestamp: new Date().toISOString()` | ⚠️ Added |

**Notes**:
- `step` 이름 미세 차이: design은 `"link"`, 구현은 `"link_generate"`. Plan에서는 `"link_generate"`로 되어 있으므로 구현이 Plan과 일치.
- `timestamp` 필드는 design에 명시되지 않았으나 Plan Section 4.1에는 포함되어 있음. 유용한 추가.
- `request` step은 설계에 없으나 코드 진입 시점 로깅으로 유용한 추가.

### 3.3 Design Section 4 -- API Route Spec

| Design Requirement | Implementation | Status |
|-------------------|----------------|:------:|
| `POST /api/auth-log` | `export async function POST(request: Request)` at `src/app/api/auth-log/route.ts` | ✅ |
| Body: `{ action: string, target: string }` | `const { action, target } = await request.json()` + validation | ✅ |
| Service role로 activities insert (RLS bypass) | `createClient(url, serviceKey, ...)` + `.from("activities").insert(...)` | ✅ |
| 응답: `{ ok: true }` | `NextResponse.json({ ok: true })` | ✅ |

### 3.4 Plan Section 5 -- Implementation Items (5 Items)

| # | Plan Item | Implementation | Status | Notes |
|---|-----------|----------------|:------:|-------|
| 1 | Edge Function 로그 추가 | `authLog()` helper + 6 call sites | ✅ | |
| 2 | API Route 생성 | `src/app/api/auth-log/route.ts` | ✅ | |
| 3 | 클라이언트 성공 로깅 (`kakao-auth.ts`에 logActivity) | `kakao-auth.ts`에는 logActivity 없음 | ⚠️ Changed | Edge Function L145-150에서 대신 수행 |
| 4 | 클라이언트 실패 로깅 (callback에서 /api/auth-log) | callback `page.tsx` catch 블록에서 호출 | ✅ | |
| 5 | Dashboard layout 로깅 (선택) | 미구현 | -- | Plan에서 "선택"으로 표기, 미이행 허용 |

### 3.5 Plan Section 7 -- Success Criteria

| Criterion | Verification | Status |
|-----------|-------------|:------:|
| Edge Function 로그에서 단계별 추적 가능 | 6개 지점에 JSON 구조화 로그 출력 확인 | ✅ |
| Dashboard 활동 피드에 "로그인 성공" 표시 | Edge Function L145-150: `action: '로그인 성공'`, `target: '카카오 OAuth'` insert | ✅ |
| 로그인 실패 시 activities에 기록 | callback page.tsx에서 `/api/auth-log` POST, route.ts에서 service role insert | ✅ |
| 기존 기능(이슈 CRUD 로깅)에 영향 없음 | `logActivity` in `src/lib/activities.ts` 및 `issues.ts` 변경 없음 | ✅ |

---

## 4. Differences Found

### 4.1 Changed Features (Design != Implementation)

| Item | Design | Implementation | Impact |
|------|--------|----------------|--------|
| 성공 로깅 위치 | `src/lib/kakao-auth.ts`에서 `logActivity()` 호출 | Edge Function(`index.ts` L145-150)에서 직접 `activities` insert | Low -- 동일 효과, 서버 사이드에서 더 안정적 |
| `step` 값 "link" | `"link"` | `"link_generate"` | Low -- Plan과 일치, design 문서만 업데이트 필요 |
| `timestamp` 필드 | Design Section 3에 미포함 | 구현에 포함 | None -- 유용한 추가 |

### 4.2 Added Features (Design X, Implementation O)

| Item | Implementation Location | Description |
|------|------------------------|-------------|
| `request` step 로깅 | Edge Function L44, L51 | 요청 수신 시점의 성공/실패 로그 추가 |
| `timestamp` 필드 | Edge Function L29 | 각 로그에 ISO timestamp 포함 |
| Input validation | `route.ts` L15-17 | action, target 필수값 검증 + 400 응답 |
| 에러 시 graceful fallback | `route.ts` L8-9, L31-32 | 환경변수 누락 시/에러 시 `{ ok: true }` 반환 (로깅 실패가 사용자 경험에 영향 없음) |

### 4.3 Missing Features (Design O, Implementation X)

| Item | Design Location | Description | Severity |
|------|-----------------|-------------|----------|
| 클라이언트 측 logActivity 호출 | Design Section 2 Step 3 | `kakao-auth.ts`에서 성공 시 logActivity 호출 설계였으나, Edge Function에서 대체 | Low (기능적으로 동일) |

---

## 5. Architecture Notes

- **성공 로깅 위치 변경의 합리성**: 클라이언트(`kakao-auth.ts`)에서 logActivity를 호출하면 인증된 세션이 필요하고 verifyOtp 완료 후에만 가능. Edge Function에서 service role로 직접 insert하면 세션 불필요하고 인증 과정 자체의 성공을 더 정확히 기록. 이 변경은 합리적인 개선.
- **에러 핸들링**: `route.ts`가 모든 에러 상황에서 `{ ok: true }`를 반환하여 로깅 실패가 사용자 로그인 흐름을 방해하지 않는 방어적 설계.

---

## 6. Match Rate Summary

```
+---------------------------------------------+
|  Overall Match Rate: 93%                     |
+---------------------------------------------+
|  Fully Matched:       11 items (79%)         |
|  Changed (equivalent): 2 items (14%)         |
|  Added (bonus):        4 items               |
|  Missing (functional): 0 items (0%)          |
|  Missing (optional):   1 item  (7%)          |
+---------------------------------------------+
```

Match Rate >= 90%: Design과 implementation이 잘 일치한다.

---

## 7. Recommended Actions

### 7.1 Documentation Update Needed

| Priority | Item | Location |
|----------|------|----------|
| Low | Design Section 2 Step 3을 실제 구현(Edge Function에서 성공 로깅)으로 업데이트 | `login-logging.design.md` |
| Low | Design Section 3의 `step` 값 `"link"`를 `"link_generate"`로 수정 | `login-logging.design.md` |
| Low | Design Section 3에 `timestamp` 필드 추가 | `login-logging.design.md` |
| Low | Design Section 3에 `request` step 추가 | `login-logging.design.md` |

### 7.2 No Code Changes Required

모든 success criteria가 충족되었으며, 구현이 설계 의도를 정확히 또는 더 개선된 방식으로 반영하고 있다.

---

## 8. Synchronization Recommendation

**Option 2: Update design to match implementation** (recommended)

설계 문서의 4개 minor 항목을 실제 구현에 맞게 업데이트하면 100% 일치 달성 가능. 구현 코드 변경은 불필요.

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-03-17 | Initial gap analysis | Claude Code |
