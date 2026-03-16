# Plan: Supabase + Neo4j Integration

## Executive Summary

| Perspective | Description |
|-------------|-------------|
| **Problem** | 대시보드 데이터(Users, Activities, Metrics)가 mock 데이터에 의존. 그래프 시각화(Neo4j)가 미연결. Kakao 로그인 후 JIRA 보드 작업 흐름이 실제 DB에 저장되지 않음. |
| **Solution** | Supabase에 users/activities/metrics 테이블 생성 + RLS 정책 적용. Neo4j Aura Free 인스턴스 생성 후 Issue/User/Label 노드 및 관계 동기화. Mock → Real 데이터 전환. |
| **Function UX Effect** | 로그인한 사용자의 JIRA 작업이 실제 DB에 저장·조회됨. 그래프 페이지에서 실제 이슈-사용자-라벨 관계를 시각적으로 탐색 가능. |
| **Core Value** | Mock에서 Real 데이터로 전환하여 실제 서비스로 사용 가능한 대시보드 완성. 관계형 DB(Supabase) + 그래프 DB(Neo4j) 하이브리드 아키텍처. |

## 1. Background

### 현재 상태

| 영역 | 상태 | 비고 |
|------|------|------|
| Kakao Auth | ✅ 동작 중 | Supabase Edge Function 연동 |
| Issues 테이블 | ✅ Supabase 연동 | CRUD 완전 동작 |
| QR Card Profiles | ✅ Supabase 연동 | 공개 프로필 |
| Users 데이터 | ❌ mock-data.ts | 하드코딩 8명 |
| Activities 로그 | ❌ mock-data.ts | 하드코딩 5건 |
| Metrics 데이터 | ❌ mock-data.ts | 하드코딩 4카드 |
| Revenue/Chart 데이터 | ❌ mock-data.ts | 하드코딩 12개월 |
| Neo4j 그래프 | ❌ 미연결 | 드라이버 설치됨, 환경변수 없음 |

### 기존 인프라

- `@supabase/supabase-js` 설치 + 클라이언트 초기화 완료
- `neo4j-driver@6.0.1` 설치 + 싱글톤 드라이버 (`src/lib/neo4j.ts`) 완료
- Graph API (`GET /api/graph`) 코드 완성 — Neo4j 미연결 시 mock 폴백
- Issues lib (`src/lib/issues.ts`) — Supabase 미연결 시 mock 폴백 패턴 확립

## 2. Goals

| # | Goal | Priority |
|---|------|----------|
| G1 | Supabase `profiles` 테이블 생성 (auth.users와 연동) | Must |
| G2 | Supabase `activities` 테이블 생성 (사용자 활동 로그) | Must |
| G3 | Supabase `metrics` 뷰/함수 생성 (집계 데이터) | Must |
| G4 | Users 페이지 → Supabase 실데이터 조회 | Must |
| G5 | Dashboard → 실시간 metrics 표시 | Must |
| G6 | Activities → 실제 활동 로그 기록 + 조회 | Must |
| G7 | Neo4j Aura Free 인스턴스 설정 가이드 | Must |
| G8 | Issue CRUD 시 Neo4j 노드/관계 동기화 | Must |
| G9 | Graph 페이지 → Neo4j 실데이터 시각화 | Must |
| G10 | Mock 폴백 유지 (Graceful degradation) | Should |

## 3. Scope

### In Scope

#### Part A: Supabase 테이블 + 데이터 레이어
- `profiles` 테이블: auth.users 트리거로 자동 생성, role/status 관리
- `activities` 테이블: 사용자 활동 기록 (이슈 생성/수정/이동 등)
- `daily_metrics` 테이블: 일별 매출/사용자/전환율 집계
- RLS (Row Level Security) 정책 적용
- Supabase SQL 마이그레이션 스크립트 제공
- `src/lib/users.ts` — profiles CRUD
- `src/lib/activities.ts` — activities 기록/조회
- `src/lib/metrics.ts` — metrics 집계 조회
- Users 페이지, Dashboard 페이지 실데이터 전환

#### Part B: Neo4j 그래프 동기화
- Neo4j Aura Free 생성 가이드
- `.env.local`에 `NEO4J_URI/USERNAME/PASSWORD` 설정
- `src/lib/neo4j-sync.ts` — Issue/User/Label 변경 시 Neo4j 동기화
- Issues CRUD 훅에 Neo4j sync 호출 추가
- Graph API가 Neo4j 실데이터 반환
- 초기 데이터 시드 스크립트 (기존 Supabase 이슈 → Neo4j)

### Out of Scope
- 실시간 WebSocket 알림
- Revenue 데이터 외부 연동 (PG사 등)
- Neo4j 클러스터/Enterprise 설정
- Supabase Edge Functions 추가

## 4. Technical Approach

### 4.1 Supabase 테이블 스키마

```sql
-- profiles: auth.users 확장 (Kakao 로그인 사용자)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  email TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user', 'viewer')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- activities: 활동 로그
CREATE TABLE activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  user_name TEXT NOT NULL,
  action TEXT NOT NULL,
  target TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- daily_metrics: 일별 집계 (seed data or manual insert)
CREATE TABLE daily_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL UNIQUE,
  revenue INTEGER DEFAULT 0,
  active_users INTEGER DEFAULT 0,
  conversion_rate NUMERIC(5,2) DEFAULT 0,
  avg_session_seconds INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 4.2 RLS 정책

- `profiles`: 인증된 사용자 전체 읽기, 본인만 수정
- `activities`: 인증된 사용자 전체 읽기, 시스템만 쓰기 (service role)
- `daily_metrics`: 인증된 사용자 읽기 전용

### 4.3 Auth Trigger (프로필 자동 생성)

Kakao 로그인 시 `auth.users`에 레코드 생성 → trigger로 `profiles`에 자동 삽입:
```sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO profiles (id, name, email, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

### 4.4 Neo4j 동기화 전략

이슈 CRUD 시 **비동기 동기화** (fire-and-forget):
```
Issue Created → Supabase INSERT → Neo4j CREATE (Issue) + RELATIONSHIPS
Issue Updated → Supabase UPDATE → Neo4j SET properties
Issue Deleted → Supabase DELETE → Neo4j DETACH DELETE
```

동기화 실패 시 로그만 남기고 메인 플로우는 차단하지 않음.

### 4.5 Neo4j Aura Free 설정 가이드

1. https://neo4j.com/cloud/aura-free/ 접속
2. Google/GitHub 계정으로 가입
3. "Create Free Instance" 클릭
4. Connection URI, Username, Password 복사
5. `.env.local`에 추가:
```
NEO4J_URI=neo4j+s://xxxxx.databases.neo4j.io
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=your-password
```

## 5. Affected Files

| File | Change |
|------|--------|
| `supabase/migrations/001_profiles.sql` | New — profiles 테이블 + trigger |
| `supabase/migrations/002_activities.sql` | New — activities 테이블 |
| `supabase/migrations/003_daily_metrics.sql` | New — daily_metrics 테이블 |
| `supabase/migrations/004_seed_metrics.sql` | New — 12개월 시드 데이터 |
| `src/lib/users.ts` | New — profiles CRUD |
| `src/lib/activities.ts` | New — activities 기록/조회 |
| `src/lib/metrics.ts` | New — metrics 집계 조회 |
| `src/lib/neo4j-sync.ts` | New — Neo4j 동기화 함수 |
| `scripts/neo4j-seed.ts` | New — 초기 데이터 시드 |
| `src/lib/issues.ts` | Modified — 활동 기록 + Neo4j sync 추가 |
| `src/app/(dashboard)/users/page.tsx` | Modified — mock → Supabase 조회 |
| `src/app/(dashboard)/dashboard/page.tsx` | Modified — mock → Supabase metrics |

## 6. Dependencies

- No new packages (기존 `@supabase/supabase-js`, `neo4j-driver` 활용)

## 7. Risks

| Risk | Mitigation |
|------|------------|
| Neo4j Aura Free 제한 (50K 노드, 175K 관계) | 대시보드 규모에서 충분 |
| Neo4j 동기화 실패 | Fire-and-forget + 로그. 메인 플로우 차단 안함 |
| Supabase RLS 미스 구성 | SQL 스크립트에 정책 포함. 테스트 포함 |
| 기존 mock 폴백 깨짐 | USE_MOCK 패턴 유지 (env 없으면 mock) |

## 8. Success Criteria

- [ ] Supabase `profiles` 테이블 생성 + Kakao 로그인 시 자동 프로필 생성
- [ ] Supabase `activities` 테이블에 이슈 작업 기록
- [ ] Supabase `daily_metrics` 12개월 시드 데이터 + 조회
- [ ] Users 페이지에서 실제 프로필 목록 표시
- [ ] Dashboard에서 실제 metrics + activities 표시
- [ ] Neo4j 환경변수 설정 후 그래프 실데이터 표시
- [ ] Issue CRUD 시 Neo4j 자동 동기화
- [ ] 환경변수 없으면 mock 폴백 정상 동작
