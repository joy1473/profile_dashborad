# Users Enhancement Design Document

> **Summary**: 사용자 관리 페이지 보강 — 아바타 표시, 역할/상태 관리, 프로필 편집, 사용자 상세 모달
>
> **Project**: SaaS Dashboard
> **Version**: 1.0
> **Author**: Euna Cho (CAIO)
> **Date**: 2026-03-17
> **Status**: Draft
> **Planning Doc**: [users-enhancement.plan.md](../../01-plan/features/users-enhancement.plan.md)

---

## 1. Overview

### 1.1 Design Goals

- 사용자 테이블에 아바타 및 관리 기능 추가
- admin 역할 사용자가 다른 사용자의 역할/상태 변경 가능
- 본인 프로필 편집 (이름) 지원
- Supabase RLS로 권한 제어 보장

### 1.2 Design Principles

- 기존 UI 패턴 유지 (Card + Table, 모달 패턴은 issue-modal과 동일)
- Optimistic update로 즉각적인 UX 반응
- RLS 기반 서버사이드 권한 제어 (클라이언트 체크는 UX용)

---

## 2. Architecture

### 2.1 Component Diagram

```
┌──────────────────────────────────────────────────┐
│ UsersPage (page.tsx)                              │
│  ├─ UserFilters (기존 필터 버튼)                    │
│  ├─ UserTable (user-table.tsx) ← NEW              │
│  │   ├─ UserAvatar (user-avatar.tsx) ← NEW        │
│  │   ├─ RoleDropdown (인라인 역할 변경) ← NEW       │
│  │   └─ StatusToggle (인라인 상태 변경) ← NEW       │
│  └─ UserModal (user-modal.tsx) ← NEW              │
│       ├─ 프로필 정보 표시                            │
│       ├─ 이름 편집 (본인만)                          │
│       └─ 역할/상태 변경 (admin만)                    │
└──────────────────────────────────────────────────┘
           │
           ▼
┌──────────────────┐     ┌────────────────────┐
│ /api/users       │────▶│ Supabase profiles  │
│  PATCH /:id      │     │ (RLS enforced)     │
└──────────────────┘     └────────────────────┘
```

### 2.2 Data Flow

```
1. 역할/상태 변경 (admin):
   Click → Optimistic Update → PATCH /api/users → Supabase UPDATE → 성공/롤백

2. 프로필 편집 (본인):
   Modal 이름 수정 → PATCH /api/users → Supabase UPDATE (auth.uid() = id) → 반영

3. 사용자 목록:
   Page Load → fetchProfiles() → Supabase SELECT → 테이블 렌더링
```

### 2.3 Dependencies

| Component | Depends On | Purpose |
|-----------|-----------|---------|
| UserTable | fetchProfiles, UserAvatar | 사용자 목록 표시 |
| UserModal | updateProfile, currentUser | 상세/편집 |
| /api/users | withAuth, Supabase | 서버 권한 체크 + DB 업데이트 |

---

## 3. Data Model

### 3.1 Entity Definition (기존 보강)

```typescript
// src/types/index.ts — User 인터페이스 (변경 없음, avatar는 이미 optional)
interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "user" | "viewer";
  status: "active" | "inactive";
  joinedAt: string;
  avatar?: string;
}

// 역할/상태 변경 입력
interface UpdateProfileInput {
  name?: string;
  role?: "admin" | "user" | "viewer";
  status?: "active" | "inactive";
}
```

### 3.2 Database Schema

기존 `profiles` 테이블 그대로 사용. 추가 마이그레이션:

```sql
-- 010_admin_role_policy.sql
-- admin만 다른 사용자의 역할/상태 변경 가능
CREATE POLICY "profiles_admin_update" ON profiles
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );
```

> 기존 `profiles_update_own` 정책은 본인 프로필 편집용으로 유지.
> admin 정책 추가로 admin은 모든 프로필 수정 가능.

---

## 4. API Specification

### 4.1 Endpoint List

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| PATCH | /api/users | 사용자 프로필 수정 | Required |

### 4.2 Detailed Specification

#### `PATCH /api/users`

**Request:**
```json
{
  "userId": "uuid-string",
  "name": "새 이름",
  "role": "admin",
  "status": "active"
}
```

**권한 로직:**
- `name` 변경: 본인(`auth.uid() === userId`) 또는 admin
- `role` 변경: admin만
- `status` 변경: admin만

**Response (200 OK):**
```json
{
  "id": "uuid",
  "name": "새 이름",
  "role": "admin",
  "status": "active"
}
```

**Error Responses:**
- `401 Unauthorized`: 미인증
- `403 Forbidden`: 권한 없음 (일반 사용자가 role 변경 시도)
- `400 Bad Request`: 유효하지 않은 입력값

---

## 5. UI/UX Design

### 5.1 사용자 테이블 보강 레이아웃

```
┌─────────────────────────────────────────────────────────────────┐
│ 사용자                                     [전체] [활성] [비활성]│
├─────────────────────────────────────────────────────────────────┤
│ ┌──────────────────────────────────────────────────────────────┐│
│ │ 아바타  이름        이메일              역할      상태  가입일 ││
│ │ ─────────────────────────────────────────────────────────────││
│ │ [img] 조은아     joytec@naver.com   [admin ▾]  [활성]  03-17 ││
│ │ [img] 홍길동     hong@kakao.local   [user ▾]   [활성]  03-16 ││
│ │ [img] 김철수     kim@kakao.local    [viewer ▾] [비활성] 03-15 ││
│ └──────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘

* [admin ▾] = 역할 드롭다운 (admin 사용자만 클릭 가능)
* [활성] = 상태 토글 (admin 사용자만 클릭 가능)
* 행 클릭 = 사용자 상세 모달
```

### 5.2 사용자 상세 모달

```
┌─────────────────────────────────┐
│ 사용자 정보                   [X]│
├─────────────────────────────────┤
│                                 │
│  [아바타 크게]                    │
│                                 │
│  이름: 조은아  [✏️ 편집]          │
│  이메일: joytec@naver.com       │
│  역할: [admin ▾]                │
│  상태: [활성 ▾]                  │
│  가입일: 2026-03-17             │
│                                 │
│  ─ ★ 현재 로그인 사용자 ─        │
│                                 │
└─────────────────────────────────┘

* 이름 편집: 본인만 (pencil 아이콘 → 인라인 편집)
* 역할/상태 변경: admin만 (드롭다운)
* 현재 로그인 사용자 = 하이라이트 표시
```

### 5.3 Component List

| Component | Location | Responsibility |
|-----------|----------|----------------|
| UsersPage | `src/app/(dashboard)/users/page.tsx` | 기존 보강: currentUser, 모달 상태 |
| UserAvatar | `src/components/users/user-avatar.tsx` | 아바타 이미지 (fallback: 이니셜) |
| UserModal | `src/components/users/user-modal.tsx` | 사용자 상세/편집 모달 |
| — | `src/lib/users.ts` | 기존 보강: updateProfile 함수 추가 |
| — | `src/app/api/users/route.ts` | NEW: 사용자 PATCH API |

---

## 6. Error Handling

| Code | Message | Cause | Handling |
|------|---------|-------|----------|
| 401 | Unauthorized | 미인증 | 로그인 리다이렉트 |
| 403 | 권한이 없습니다 | 일반 사용자가 admin 기능 시도 | Toast 알림 |
| 400 | 유효하지 않은 입력 | role/status 잘못된 값 | Toast 알림 |

---

## 7. Security Considerations

- [x] RLS: `profiles_update_own` — 본인 프로필 편집
- [ ] RLS: `profiles_admin_update` — admin 전체 프로필 수정 (NEW, 010 마이그레이션)
- [x] API 라우트 `withAuth` 래퍼로 인증 필수
- [ ] API에서 role/status 변경 시 요청자가 admin인지 서버에서 검증
- [x] 입력값 검증 (role, status enum 체크)

---

## 8. Test Plan

### 8.1 Test Cases (Key)

- [ ] 사용자 목록에 아바타 정상 표시 (이미지 + fallback)
- [ ] admin이 역할 변경 → DB 반영 확인
- [ ] admin이 상태 변경 → DB 반영 확인
- [ ] 일반 사용자가 역할 변경 시도 → 403 또는 UI 비활성
- [ ] 본인 이름 편집 → DB 반영 확인
- [ ] 사용자 행 클릭 → 모달 열림
- [ ] 현재 로그인 사용자 하이라이트

---

## 9. Implementation Guide

### 9.1 File Structure

```
src/
├── app/
│   ├── (dashboard)/users/page.tsx      # MODIFY: 모달, currentUser, admin 체크
│   └── api/users/route.ts              # NEW: PATCH API
├── components/
│   └── users/
│       ├── user-avatar.tsx             # NEW: 아바타 컴포넌트
│       └── user-modal.tsx              # NEW: 사용자 상세/편집 모달
├── lib/
│   └── users.ts                        # MODIFY: updateProfile 추가
└── types/
    └── index.ts                        # MODIFY: UpdateProfileInput 추가

supabase/
└── migrations/
    └── 010_admin_role_policy.sql        # NEW: admin UPDATE RLS
```

### 9.2 Implementation Order

1. [ ] **Step 1**: `010_admin_role_policy.sql` — admin RLS 정책 추가
2. [ ] **Step 2**: `src/types/index.ts` — `UpdateProfileInput` 타입 추가
3. [ ] **Step 3**: `src/app/api/users/route.ts` — PATCH API 엔드포인트
4. [ ] **Step 4**: `src/lib/users.ts` — `updateProfile()` 함수 추가
5. [ ] **Step 5**: `src/components/users/user-avatar.tsx` — 아바타 컴포넌트
6. [ ] **Step 6**: `src/components/users/user-modal.tsx` — 사용자 상세/편집 모달
7. [ ] **Step 7**: `src/app/(dashboard)/users/page.tsx` — 페이지 보강 (아바타, 모달, 역할/상태 인라인 변경)

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-17 | Initial draft | Euna Cho |
