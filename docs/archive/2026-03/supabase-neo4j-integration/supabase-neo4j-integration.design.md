# Design: Supabase + Neo4j Integration

## 1. Overview

Mock 데이터(users, activities, metrics, revenue)를 Supabase 실데이터로 전환하고, Issue CRUD 시 Neo4j 그래프 DB에 노드/관계를 동기화하는 통합 설계.

### 설계 원칙
- **USE_MOCK 패턴 유지**: `issues.ts`에서 확립된 `const USE_MOCK = !process.env.NEXT_PUBLIC_SUPABASE_URL` 패턴을 모든 새 lib에 동일 적용
- **Fire-and-forget 동기화**: Neo4j 동기화 실패가 메인 플로우를 차단하지 않음
- **Graceful degradation**: 환경변수 없으면 mock 데이터 폴백

## 2. SQL Migrations

### 2.1 `supabase/migrations/001_profiles.sql`

```sql
-- profiles 테이블: auth.users 확장
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  email TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user', 'viewer')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select" ON profiles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Auth trigger: 새 사용자 가입 시 자동 프로필 생성
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

### 2.2 `supabase/migrations/002_activities.sql`

```sql
-- activities 테이블: 사용자 활동 로그
CREATE TABLE activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  user_name TEXT NOT NULL,
  action TEXT NOT NULL,
  target TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "activities_select" ON activities
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "activities_insert" ON activities
  FOR INSERT TO authenticated WITH CHECK (true);
```

### 2.3 `supabase/migrations/003_daily_metrics.sql`

```sql
-- daily_metrics 테이블: 일별 집계 데이터
CREATE TABLE daily_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL UNIQUE,
  revenue INTEGER DEFAULT 0,
  active_users INTEGER DEFAULT 0,
  conversion_rate NUMERIC(5,2) DEFAULT 0,
  avg_session_seconds INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE daily_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "metrics_select" ON daily_metrics
  FOR SELECT TO authenticated USING (true);
```

### 2.4 `supabase/migrations/004_seed_metrics.sql`

```sql
-- 12개월 시드 데이터 (mock-data.ts 기반)
INSERT INTO daily_metrics (date, revenue, active_users, conversion_rate, avg_session_seconds) VALUES
  ('2025-01-01', 3200, 1800, 2.80, 245),
  ('2025-02-01', 4100, 2000, 2.95, 258),
  ('2025-03-01', 3800, 2200, 3.10, 262),
  ('2025-04-01', 5200, 2400, 3.15, 270),
  ('2025-05-01', 4800, 2100, 3.00, 255),
  ('2025-06-01', 6100, 2600, 3.20, 278),
  ('2025-07-01', 5900, 2430, 3.24, 272),
  ('2025-08-01', 6400, 2700, 3.30, 285),
  ('2025-09-01', 5800, 2550, 3.18, 268),
  ('2025-10-01', 6900, 2850, 3.35, 290),
  ('2025-11-01', 7500, 2950, 3.42, 295),
  ('2025-12-01', 7200, 3100, 3.50, 300);
```

## 3. Component Designs

### 3.1 `src/lib/users.ts` — Profiles CRUD

```typescript
import { supabase } from "./supabase";
import { users as mockUsers } from "./mock-data";
import type { User } from "@/types";

const USE_MOCK = !process.env.NEXT_PUBLIC_SUPABASE_URL;

export async function fetchProfiles(): Promise<User[]> {
  if (USE_MOCK) return mockUsers;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;

  return data.map((p) => ({
    id: p.id,
    name: p.name,
    email: p.email ?? "",
    role: p.role as User["role"],
    status: p.status as User["status"],
    joinedAt: p.created_at?.split("T")[0] ?? "",
    avatar: p.avatar_url ?? undefined,
  }));
}
```

**API Surface**:
| Function | Params | Returns | Description |
|----------|--------|---------|-------------|
| `fetchProfiles()` | — | `Promise<User[]>` | 프로필 전체 조회 (mock 폴백) |

**매핑**: Supabase `profiles` 컬럼 → 기존 `User` 타입 변환 (`created_at` → `joinedAt`, `avatar_url` → `avatar`)

### 3.2 `src/lib/activities.ts` — Activities 기록/조회

```typescript
import { supabase } from "./supabase";
import { activities as mockActivities } from "./mock-data";
import type { Activity } from "@/types";

const USE_MOCK = !process.env.NEXT_PUBLIC_SUPABASE_URL;

export async function fetchActivities(limit = 10): Promise<Activity[]> {
  if (USE_MOCK) return mockActivities.slice(0, limit);

  const { data, error } = await supabase
    .from("activities")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;

  return data.map((a) => ({
    id: a.id,
    user: a.user_name,
    action: a.action,
    target: a.target,
    timestamp: formatRelativeTime(a.created_at),
  }));
}

export async function logActivity(
  userId: string | null,
  userName: string,
  action: string,
  target: string
): Promise<void> {
  if (USE_MOCK) return; // mock 모드에서는 기록하지 않음

  await supabase.from("activities").insert({
    user_id: userId,
    user_name: userName,
    action,
    target,
  });
}

function formatRelativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "방금 전";
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  return `${days}일 전`;
}
```

**API Surface**:
| Function | Params | Returns | Description |
|----------|--------|---------|-------------|
| `fetchActivities(limit?)` | `limit: number = 10` | `Promise<Activity[]>` | 최근 활동 조회 |
| `logActivity(userId, userName, action, target)` | 4개 문자열 | `Promise<void>` | 활동 기록 (mock 시 no-op) |

### 3.3 `src/lib/metrics.ts` — Metrics 조회

```typescript
import { supabase } from "./supabase";
import { metrics as mockMetrics, revenueData as mockRevenueData } from "./mock-data";
import type { MetricCard, ChartData } from "@/types";

const USE_MOCK = !process.env.NEXT_PUBLIC_SUPABASE_URL;

export async function fetchMetrics(): Promise<MetricCard[]> {
  if (USE_MOCK) return mockMetrics;

  const { data, error } = await supabase
    .from("daily_metrics")
    .select("*")
    .order("date", { ascending: false })
    .limit(2);
  if (error) throw error;
  if (!data || data.length < 2) return mockMetrics;

  const [latest, prev] = data;
  const pctChange = (curr: number, old: number) =>
    old === 0 ? 0 : Math.round(((curr - old) / old) * 1000) / 10;

  const revChange = pctChange(latest.revenue, prev.revenue);
  const userChange = pctChange(latest.active_users, prev.active_users);
  const convChange = pctChange(Number(latest.conversion_rate), Number(prev.conversion_rate));
  const sessChange = pctChange(latest.avg_session_seconds, prev.avg_session_seconds);

  return [
    { title: "총 매출", value: `₩${(latest.revenue * 10000).toLocaleString()}`, change: Math.abs(revChange), trend: revChange >= 0 ? "up" : "down" },
    { title: "활성 사용자", value: latest.active_users.toLocaleString(), change: Math.abs(userChange), trend: userChange >= 0 ? "up" : "down" },
    { title: "전환율", value: `${latest.conversion_rate}%`, change: Math.abs(convChange), trend: convChange >= 0 ? "up" : "down" },
    { title: "평균 세션", value: formatSeconds(latest.avg_session_seconds), change: Math.abs(sessChange), trend: sessChange >= 0 ? "up" : "down" },
  ];
}

export async function fetchRevenueData(): Promise<ChartData[]> {
  if (USE_MOCK) return mockRevenueData;

  const { data, error } = await supabase
    .from("daily_metrics")
    .select("date, revenue, active_users")
    .order("date", { ascending: true });
  if (error) throw error;

  const monthNames = ["1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월"];
  return (data ?? []).map((d) => ({
    name: monthNames[new Date(d.date).getMonth()],
    date: d.date,
    revenue: d.revenue,
    users: d.active_users,
  }));
}

function formatSeconds(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}분 ${sec}초`;
}
```

**API Surface**:
| Function | Params | Returns | Description |
|----------|--------|---------|-------------|
| `fetchMetrics()` | — | `Promise<MetricCard[]>` | 4개 KPI 카드 데이터 (최근 2개월 비교) |
| `fetchRevenueData()` | — | `Promise<ChartData[]>` | 차트용 월별 매출/사용자 데이터 |

### 3.4 `src/lib/neo4j-sync.ts` — Neo4j 동기화

```typescript
import { getDriver } from "./neo4j";
import type { Issue } from "@/types/issue";

async function runCypher(query: string, params: Record<string, unknown>): Promise<void> {
  const driver = getDriver();
  if (!driver) return; // Neo4j 미설정 시 skip

  const session = driver.session();
  try {
    await session.run(query, params);
  } catch (error) {
    console.error("Neo4j sync failed:", error);
  } finally {
    await session.close();
  }
}

export async function syncIssueCreate(issue: Issue): Promise<void> {
  // Issue 노드 생성
  await runCypher(
    `MERGE (i:Issue {id: $id})
     SET i.title = $title, i.status = $status, i.priority = $priority,
         i.created_at = $created_at
     WITH i
     // Assignee 관계
     FOREACH (_ IN CASE WHEN $assignee_id IS NOT NULL THEN [1] ELSE [] END |
       MERGE (u:User {id: $assignee_id})
       ON CREATE SET u.name = $assignee_name
       MERGE (i)-[:ASSIGNED_TO]->(u)
     )
     WITH i
     // Label 관계
     UNWIND $labels AS labelName
     MERGE (l:Label {name: labelName})
     MERGE (i)-[:LABELED_WITH]->(l)`,
    {
      id: issue.id,
      title: issue.title,
      status: issue.status,
      priority: issue.priority,
      created_at: issue.created_at,
      assignee_id: issue.assignee_id,
      assignee_name: issue.assignee_name ?? "Unknown",
      labels: issue.labels ?? [],
    }
  );
}

export async function syncIssueUpdate(issue: Issue): Promise<void> {
  // 기존 관계 제거 후 재생성
  await runCypher(
    `MATCH (i:Issue {id: $id})
     SET i.title = $title, i.status = $status, i.priority = $priority
     WITH i
     OPTIONAL MATCH (i)-[r:ASSIGNED_TO]->()
     DELETE r
     WITH i
     OPTIONAL MATCH (i)-[r:LABELED_WITH]->()
     DELETE r
     WITH i
     FOREACH (_ IN CASE WHEN $assignee_id IS NOT NULL THEN [1] ELSE [] END |
       MERGE (u:User {id: $assignee_id})
       ON CREATE SET u.name = $assignee_name
       MERGE (i)-[:ASSIGNED_TO]->(u)
     )
     WITH i
     UNWIND $labels AS labelName
     MERGE (l:Label {name: labelName})
     MERGE (i)-[:LABELED_WITH]->(l)`,
    {
      id: issue.id,
      title: issue.title,
      status: issue.status,
      priority: issue.priority,
      assignee_id: issue.assignee_id,
      assignee_name: issue.assignee_name ?? "Unknown",
      labels: issue.labels ?? [],
    }
  );
}

export async function syncIssueDelete(issueId: string): Promise<void> {
  await runCypher(
    `MATCH (i:Issue {id: $id}) DETACH DELETE i`,
    { id: issueId }
  );
}
```

**API Surface**:
| Function | Params | Returns | Description |
|----------|--------|---------|-------------|
| `syncIssueCreate(issue)` | `Issue` | `Promise<void>` | Issue + User + Label 노드/관계 생성 |
| `syncIssueUpdate(issue)` | `Issue` | `Promise<void>` | 속성 갱신 + 관계 재생성 |
| `syncIssueDelete(issueId)` | `string` | `Promise<void>` | Issue 노드 + 모든 관계 삭제 |

**동기화 전략**: Fire-and-forget — `runCypher` 내부에서 에러를 catch하고 로그만 남김. 호출부에서 `await` 하지 않아도 무방.

### 3.5 `scripts/neo4j-seed.ts` — 초기 데이터 시드

Supabase의 기존 issues 데이터를 Neo4j에 일괄 동기화하는 스크립트.

```typescript
// 실행: npx tsx scripts/neo4j-seed.ts
// 1. Supabase에서 전체 issues 조회
// 2. 각 issue에 대해 syncIssueCreate 호출
// 3. User 노드는 profiles 테이블에서 조회하여 생성
// 4. 결과 요약 출력 (노드 수, 관계 수)
```

**동작 흐름**:
1. `supabase.from("issues").select("*")` → 전체 이슈 로드
2. `supabase.from("profiles").select("id, name")` → 전체 사용자 로드
3. Neo4j에 User 노드 일괄 MERGE
4. 각 Issue에 대해 `syncIssueCreate()` 호출
5. 결과 출력: `Seeded N issues, M users, K labels`

## 4. Existing File Modifications

### 4.1 `src/lib/issues.ts` — 활동 기록 + Neo4j sync 추가

**변경 사항**:
- `createIssue()`: 성공 후 `logActivity()` + `syncIssueCreate()` 호출
- `updateIssue()`: 성공 후 `logActivity()` + `syncIssueUpdate()` 호출
- `deleteIssue()`: 성공 후 `logActivity()` + `syncIssueDelete()` 호출

```typescript
// createIssue 수정 예시 (Supabase 분기 내부, return data 전):
import { logActivity } from "./activities";
import { syncIssueCreate } from "./neo4j-sync";

// ... existing code ...
// After successful insert:
logActivity(user.id, user.user_metadata?.name ?? "Unknown", "이슈 생성", data.title);
syncIssueCreate(data);
return data;
```

**주의**: `logActivity`와 `syncIssueCreate`는 fire-and-forget으로 호출. `await` 없이 실행하여 응답 지연 방지. Mock 모드에서는 두 함수 모두 no-op.

### 4.2 `src/app/(dashboard)/users/page.tsx` — Mock → Supabase

**변경 사항**:
- `import { users } from "@/lib/mock-data"` → `import { fetchProfiles } from "@/lib/users"`
- `useState` + `useEffect`로 비동기 로딩
- 로딩 상태 처리 (기존 skeleton-loader 활용 가능)

```typescript
// Before:
const filtered = filter === "all" ? allUsers : allUsers.filter(...);

// After:
const [users, setUsers] = useState<User[]>([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  fetchProfiles().then(setUsers).finally(() => setLoading(false));
}, []);

const filtered = filter === "all" ? users : users.filter(...);
```

### 4.3 `src/app/(dashboard)/dashboard/page.tsx` — Mock → Supabase

**변경 사항**:
- `import { metrics, activities, revenueData } from "@/lib/mock-data"` 제거
- `import { fetchMetrics, fetchRevenueData } from "@/lib/metrics"`
- `import { fetchActivities } from "@/lib/activities"`
- 3개 state + useEffect로 비동기 로딩
- `filteredData`의 소스를 `revenueData` state로 변경

```typescript
const [metricsData, setMetricsData] = useState<MetricCard[]>([]);
const [activitiesData, setActivitiesData] = useState<Activity[]>([]);
const [revenueData, setRevenueData] = useState<ChartData[]>([]);

useEffect(() => {
  fetchMetrics().then(setMetricsData);
  fetchRevenueData().then(setRevenueData);
  fetchActivities(5).then(setActivitiesData);
}, []);
```

## 5. Data Flow

```
[Kakao Login] → auth.users INSERT
       ↓ (trigger)
   profiles INSERT
       ↓
[JIRA Board] → createIssue()
       ├─→ Supabase issues INSERT
       ├─→ logActivity() → Supabase activities INSERT
       └─→ syncIssueCreate() → Neo4j CREATE (Issue)-[:ASSIGNED_TO]->(User)
                                          (Issue)-[:LABELED_WITH]->(Label)
       ↓
[Dashboard] ← fetchMetrics() ← Supabase daily_metrics
            ← fetchActivities() ← Supabase activities
            ← fetchRevenueData() ← Supabase daily_metrics

[Graph Page] ← GET /api/graph ← Neo4j MATCH (n)-[r]->(m)
```

## 6. Environment Variables

```env
# 기존 (변경 없음)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# 신규 (Neo4j Aura Free)
NEO4J_URI=neo4j+s://xxxxx.databases.neo4j.io
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=your-password
```

**Fallback 동작**:
- `NEXT_PUBLIC_SUPABASE_URL` 없음 → 모든 lib이 mock 데이터 반환
- `NEO4J_URI` 없음 → `getDriver()` returns null → sync 함수 skip, Graph API는 mock 반환

## 7. Implementation Order

| # | File | Type | Dependencies | Lines (est.) |
|---|------|------|-------------|:------------:|
| 1 | `supabase/migrations/001_profiles.sql` | New | — | ~35 |
| 2 | `supabase/migrations/002_activities.sql` | New | 001 | ~18 |
| 3 | `supabase/migrations/003_daily_metrics.sql` | New | — | ~18 |
| 4 | `supabase/migrations/004_seed_metrics.sql` | New | 003 | ~15 |
| 5 | `src/lib/users.ts` | New | profiles 테이블 | ~25 |
| 6 | `src/lib/activities.ts` | New | activities 테이블 | ~45 |
| 7 | `src/lib/metrics.ts` | New | daily_metrics 테이블 | ~55 |
| 8 | `src/lib/neo4j-sync.ts` | New | neo4j.ts | ~70 |
| 9 | `src/lib/issues.ts` | Modified | activities.ts, neo4j-sync.ts | +10 |
| 10 | `src/app/(dashboard)/users/page.tsx` | Modified | users.ts | +8, -2 |
| 11 | `src/app/(dashboard)/dashboard/page.tsx` | Modified | metrics.ts, activities.ts | +12, -3 |
| 12 | `scripts/neo4j-seed.ts` | New | neo4j-sync.ts, supabase | ~40 |

**구현 순서**: SQL 마이그레이션(1-4) → 데이터 레이어(5-8) → 기존 코드 수정(9-11) → 시드 스크립트(12)

## 8. Testing Strategy

- **SQL**: Supabase Dashboard에서 직접 실행 + `SELECT` 검증
- **Lib 함수**: `USE_MOCK=true`(환경변수 미설정)로 기존 동작 확인 → Supabase 연결 후 실데이터 확인
- **Neo4j sync**: Neo4j Aura 콘솔에서 `MATCH (n) RETURN n` 확인
- **E2E**: 기존 Playwright 테스트가 mock 모드에서 정상 통과 확인
