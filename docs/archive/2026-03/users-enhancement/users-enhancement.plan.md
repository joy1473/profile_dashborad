# Users Enhancement Planning Document

> **Summary**: 사용자 관리 페이지 보강 — 신규 사용자 가입 오류 수정, 프로필 관리, 역할/상태 변경, 사용자 초대 기능
>
> **Project**: SaaS Dashboard
> **Version**: 1.0
> **Author**: Euna Cho (CAIO)
> **Date**: 2026-03-17
> **Status**: Draft

---

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem** | 신규 사용자 로그인 시 "Database error creating user" 발생, 사용자 페이지가 읽기 전용으로 관리 기능 부재 |
| **Solution** | 인증 트리거 수정 + 사용자 CRUD 관리 기능 + 역할/상태 변경 + 프로필 편집 UI 구현 |
| **Function/UX Effect** | 관리자가 사용자를 직접 관리하고, 각 사용자가 자신의 프로필을 편집할 수 있는 완전한 사용자 관리 경험 |
| **Core Value** | 다중 사용자 SaaS 환경에서 안정적인 온보딩과 팀 관리 기반 확보 |

---

## 1. Overview

### 1.1 Purpose

현재 `/users` 페이지는 프로필 목록만 표시하는 읽기 전용 상태. 신규 사용자 가입 시 DB 트리거 오류가 발생하며, 관리자가 사용자 역할/상태를 변경하거나 프로필을 편집할 수 없음. 이 기능을 통해 완전한 사용자 관리 체계를 구축한다.

### 1.2 Background

- 신규 Kakao 로그인 시 `handle_new_user()` 트리거에서 메타데이터 키 불일치(`name` vs `full_name`) 및 중복 INSERT 미처리로 "Database error creating user" 발생
- 관리자가 팀원의 역할(admin/user/viewer)이나 상태(active/inactive)를 변경할 수 없음
- 사용자 본인이 이름, 아바타 등 프로필을 수정할 수 없음
- 사용자 아바타가 테이블에 표시되지 않음

### 1.3 Related Documents

- Bug Fix: `supabase/migrations/009_fix_handle_new_user.sql` (트리거 수정 완료)
- Edge Function: `supabase/functions/kakao-auth-dashboard/index.ts` (에러 핸들링 보강 완료)
- 현재 사용자 페이지: `src/app/(dashboard)/users/page.tsx`

---

## 2. Scope

### 2.1 In Scope

- [x] 인증 트리거 수정 (009 마이그레이션, 이미 완료)
- [x] Edge Function 에러 핸들링 보강 (이미 완료)
- [ ] 사용자 테이블에 아바타 표시
- [ ] 관리자: 사용자 역할 변경 (admin/user/viewer)
- [ ] 관리자: 사용자 상태 변경 (active/inactive)
- [ ] 본인 프로필 편집 (이름, 아바타)
- [ ] 사용자 상세 모달/패널
- [ ] 사용자 API 라우트 (`/api/users`)

### 2.2 Out of Scope

- 사용자 삭제 (Supabase auth 연동 필요, 별도 기능으로)
- 이메일 초대 시스템
- 팀/조직 관리 (별도 feature)
- 비밀번호 관리 (Kakao OAuth 전용)

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-01 | 사용자 테이블에 아바타 이미지 표시 | High | Pending |
| FR-02 | 관리자가 사용자 역할(role) 변경 가능 | High | Pending |
| FR-03 | 관리자가 사용자 상태(status) 변경 가능 | High | Pending |
| FR-04 | 사용자 클릭 시 상세 모달 표시 | Medium | Pending |
| FR-05 | 본인 프로필 편집 (이름 변경) | Medium | Pending |
| FR-06 | 사용자 역할/상태 변경 API | High | Pending |
| FR-07 | 현재 로그인 사용자 표시 (하이라이트) | Low | Pending |
| FR-08 | 신규 가입 사용자 정상 프로필 생성 확인 | High | Done |

### 3.2 Non-Functional Requirements

| Category | Criteria | Measurement Method |
|----------|----------|-------------------|
| Performance | 사용자 목록 로딩 < 500ms | Network tab 확인 |
| Security | admin만 역할/상태 변경 가능 (RLS) | Supabase RLS 정책 검증 |
| UX | 역할 변경 즉시 반영 (optimistic update) | 수동 테스트 |

---

## 4. Success Criteria

### 4.1 Definition of Done

- [ ] 신규 사용자 가입 시 프로필 정상 생성 (트리거 수정 반영)
- [ ] 사용자 목록에 아바타 표시
- [ ] 관리자가 역할/상태 변경 가능
- [ ] 본인 프로필 편집 가능
- [ ] RLS 정책으로 권한 제어 검증
- [ ] Vercel 배포 후 정상 동작 확인

### 4.2 Quality Criteria

- [ ] Zero lint errors (`pnpm lint`)
- [ ] Build 성공 (`pnpm build`)
- [ ] PDCA Gap Analysis Match Rate >= 90%

---

## 5. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| admin RLS 정책 미적용 시 일반 사용자가 역할 변경 가능 | High | Medium | profiles UPDATE 정책에 admin 체크 추가 |
| Kakao 아바타 URL 만료 | Low | Medium | avatar_url 저장 시 프록시 없이 직접 사용 (Kakao URL 장기 유효) |
| 트리거 수정 미반영 시 여전히 에러 | High | Low | Supabase SQL Editor에서 직접 실행 확인 |

---

## 6. Architecture Considerations

### 6.1 Project Level Selection

| Level | Characteristics | Recommended For | Selected |
|-------|-----------------|-----------------|:--------:|
| **Starter** | Simple structure | Static sites | ☐ |
| **Dynamic** | Feature-based, BaaS integration | Web apps with backend | ☑ |
| **Enterprise** | Strict layer separation | High-traffic systems | ☐ |

### 6.2 Key Architectural Decisions

| Decision | Options | Selected | Rationale |
|----------|---------|----------|-----------|
| Framework | Next.js 16 App Router | Next.js 16 | 기존 프로젝트 유지 |
| State Management | useState + Zustand | useState | 페이지 로컬 상태로 충분 |
| API Client | Supabase JS + fetch | Supabase JS | 기존 패턴 유지 |
| Styling | Tailwind CSS 4 | Tailwind CSS 4 | 기존 프로젝트 유지 |
| Backend | Supabase (RLS + Edge Functions) | Supabase | 기존 인프라 활용 |

### 6.3 구현 구조

```
src/
├── app/
│   ├── (dashboard)/users/page.tsx    # 사용자 목록 보강
│   └── api/users/route.ts            # NEW: 사용자 CRUD API
├── components/
│   └── users/
│       ├── user-table.tsx             # NEW: 사용자 테이블 컴포넌트
│       ├── user-modal.tsx             # NEW: 사용자 상세/편집 모달
│       └── user-avatar.tsx            # NEW: 아바타 컴포넌트
├── lib/
│   └── users.ts                       # 기존 보강 (update, role change)
└── types/
    └── index.ts                       # User 타입 보강 (avatar 필수화)

supabase/
└── migrations/
    ├── 009_fix_handle_new_user.sql    # DONE: 트리거 수정
    └── 010_admin_role_policy.sql      # NEW: admin 역할 변경 RLS
```

---

## 7. Convention Prerequisites

### 7.1 Existing Project Conventions

- [x] `CLAUDE.md` has coding conventions section
- [x] ESLint configuration (flat config)
- [x] TypeScript configuration (`tsconfig.json`)
- [x] Tailwind CSS 4 with `@/*` path alias

### 7.2 Conventions to Define/Verify

| Category | Current State | To Define | Priority |
|----------|---------------|-----------|:--------:|
| **Naming** | exists (Korean UI text) | 컴포넌트 네이밍 유지 | High |
| **Folder structure** | exists (App Router) | `components/users/` 추가 | High |
| **API Routes** | exists (`api/graph/`, `api/issues/`) | `api/users/` 추가 | High |
| **RLS Pattern** | exists (profiles, issues) | admin 전용 정책 추가 | High |

### 7.3 Environment Variables Needed

| Variable | Purpose | Scope | To Be Created |
|----------|---------|-------|:-------------:|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase endpoint | Client | 기존 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase key | Client | 기존 |

---

## 8. Next Steps

1. [ ] Write design document (`users-enhancement.design.md`)
2. [ ] Supabase에 009 마이그레이션 SQL 실행 확인
3. [ ] Edge Function 재배포 확인
4. [ ] Start implementation

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-17 | Initial draft + bug fix (009, edge function) | Euna Cho |
