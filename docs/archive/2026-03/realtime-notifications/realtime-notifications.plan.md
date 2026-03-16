# Plan: Realtime Notifications

## Executive Summary

| Perspective | Description |
|-------------|-------------|
| **Problem** | 이슈 생성/수정/이동/삭제 시 다른 사용자(또는 같은 사용자의 다른 탭)에게 변경 사항이 즉시 반영되지 않음. Board 페이지를 수동 새로고침해야 최신 상태를 볼 수 있음. |
| **Solution** | Supabase Realtime으로 `issues` 테이블의 INSERT/UPDATE/DELETE 이벤트를 구독. 변경 시 Toast 알림 표시 + Board 자동 갱신. |
| **Function UX Effect** | 이슈 변경 시 화면 우하단에 Toast 알림("김민수님이 이슈를 생성했습니다")이 나타남. Board가 자동으로 최신 상태로 갱신됨. |
| **Core Value** | 실시간 협업 경험 제공. 수동 새로고침 없이 팀원의 작업을 즉시 확인 가능. |

## 1. Background

### 현재 상태

| 영역 | 상태 | 비고 |
|------|------|------|
| Supabase Realtime | ❌ 미사용 | `@supabase/supabase-js`에 내장되어 있음 |
| Toast 시스템 | ✅ 구현됨 | `src/components/ui/toast.tsx` — error/success 타입 지원 |
| Board 데이터 | ✅ Supabase 연동 | `fetchIssues()` 호출로 로드, 수동 갱신만 가능 |
| Activities 로그 | ✅ Supabase 연동 | `logActivity()` — 이슈 CRUD 시 기록 |

### 기존 인프라
- `@supabase/supabase-js` — Realtime 채널 구독 기능 내장
- `ToastProvider` + `useToast()` — 알림 UI 즉시 사용 가능
- `issues.ts` — CRUD 후 `logActivity()` 호출 패턴 확립

## 2. Goals

| # | Goal | Priority |
|---|------|----------|
| G1 | `issues` 테이블 Realtime 구독 (INSERT/UPDATE/DELETE) | Must |
| G2 | 이벤트 수신 시 Toast 알림 표시 | Must |
| G3 | Board 페이지 자동 갱신 (새로고침 없이) | Must |
| G4 | Dashboard 활동 로그 자동 갱신 | Should |
| G5 | Toast에 이벤트 타입별 메시지 (생성/수정/삭제) | Must |
| G6 | 본인 액션은 알림 제외 (선택적) | Should |

## 3. Scope

### In Scope
- Supabase Realtime 채널 구독 훅 (`useRealtimeIssues`)
- `issues` 테이블 변경 이벤트 수신
- Toast 알림 (이벤트 타입별 한국어 메시지)
- Board 페이지 이슈 목록 자동 갱신
- Dashboard 활동 로그 자동 갱신
- 구독 정리 (컴포넌트 언마운트 시 unsubscribe)

### Out of Scope
- 브라우저 Push 알림 (Web Notification API)
- 알림 히스토리/센터 UI
- 이메일/SMS 알림
- 사용자별 알림 설정

## 4. Technical Approach

### 4.1 Supabase Realtime 구독

Supabase Realtime은 PostgreSQL의 변경사항을 WebSocket으로 전달:
```typescript
supabase
  .channel("issues-changes")
  .on("postgres_changes", { event: "*", schema: "public", table: "issues" }, (payload) => {
    // payload.eventType: "INSERT" | "UPDATE" | "DELETE"
    // payload.new: 새 레코드 (INSERT/UPDATE)
    // payload.old: 이전 레코드 (UPDATE/DELETE)
  })
  .subscribe();
```

### 4.2 Supabase Realtime 활성화 (필수)

Supabase Dashboard → Database → Replication에서 `issues` 테이블의 Realtime을 활성화해야 함:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE issues;
```

### 4.3 커스텀 훅

`useRealtimeIssues(onEvent)` — 이슈 변경 이벤트를 구독하고 콜백으로 전달

### 4.4 Toast 메시지

| Event | Toast 메시지 |
|-------|-------------|
| INSERT | "새 이슈가 생성되었습니다: {title}" |
| UPDATE | "이슈가 수정되었습니다: {title}" |
| DELETE | "이슈가 삭제되었습니다" |

## 5. Affected Files

| File | Change |
|------|--------|
| `src/hooks/use-realtime-issues.ts` | New — Realtime 구독 훅 |
| `src/app/(dashboard)/board/page.tsx` | Modified — 훅 연결 + 자동 갱신 |
| `src/app/(dashboard)/dashboard/page.tsx` | Modified — 활동 로그 자동 갱신 |

## 6. Dependencies

- No new packages (Supabase Realtime은 `@supabase/supabase-js`에 내장)

## 7. Risks

| Risk | Mitigation |
|------|------------|
| Supabase Realtime 미활성화 | SQL로 publication 추가 가이드 제공 |
| WebSocket 연결 끊김 | Supabase SDK가 자동 재연결 처리 |
| 과다 알림 (빈번한 변경) | Toast 4초 자동 소멸 (기존 구현) |
| 본인 액션 알림 중복 | G6에서 선택적 필터링 (Should) |

## 8. Success Criteria

- [ ] `issues` 테이블 Realtime 구독 동작
- [ ] 이슈 생성 시 Toast 알림 표시
- [ ] 이슈 수정 시 Toast 알림 표시
- [ ] 이슈 삭제 시 Toast 알림 표시
- [ ] Board 자동 갱신 (새로고침 없이)
- [ ] Dashboard 활동 로그 자동 갱신
- [ ] 컴포넌트 언마운트 시 구독 정리
