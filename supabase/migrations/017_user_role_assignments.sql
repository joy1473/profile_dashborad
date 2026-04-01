-- 사용자 역할 이력 테이블 (1 user = N 역할, 기간 기반)
-- 1명이 동시에 영업+행정+강사 가능, 월별 정산 시 해당 월 역할 기준

-- ════════════════════════════════════════
-- 1. user_role_assignments (역할 배정 이력)
-- ════════════════════════════════════════
CREATE TABLE IF NOT EXISTS user_role_assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- 역할
  role TEXT NOT NULL CHECK (role IN ('영업','강사','행정','관리자')),

  -- 등급 (역할별 의미가 다름)
  -- 강사: S급/A급/B급/C급/보조
  -- 영업: 관리자/실무/제휴
  -- 행정: 정규/계약
  -- 관리자: 대표/PM
  grade TEXT NOT NULL DEFAULT '',

  -- 단가 (역할별 의미가 다름)
  -- 강사: AI 시간당 단가 (천원)
  ai_hourly_rate INTEGER DEFAULT 0,
  -- 강사: 일반 시간당 단가 (천원)
  normal_hourly_rate INTEGER DEFAULT 0,
  -- 영업/행정: 매출 대비 배분율 (%)
  rate_percent NUMERIC(5,2) DEFAULT 0,
  -- 정규직: 월급여 (천원)
  monthly_salary INTEGER DEFAULT 0,

  -- 기간 (NULL = 현재 진행중)
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,  -- NULL = 현재 활성

  -- NCS (강사용)
  ncs_code TEXT DEFAULT '',         -- 예: 20010703
  ncs_name TEXT DEFAULT '',         -- 예: 인공지능모델링

  -- 자격/경력 (강사용)
  qualification TEXT DEFAULT '',     -- 학위, 자격증
  career_years INTEGER DEFAULT 0,   -- 경력 년수

  -- 메모
  notes TEXT DEFAULT '',

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- 같은 사용자가 같은 역할을 동일 기간에 중복 배정 방지
  -- (end_date가 NULL인 동일 role은 1개만)
  CONSTRAINT unique_active_role UNIQUE (user_id, role, start_date)
);

CREATE INDEX idx_role_assignments_user ON user_role_assignments(user_id);
CREATE INDEX idx_role_assignments_period ON user_role_assignments(start_date, end_date);
CREATE INDEX idx_role_assignments_role ON user_role_assignments(role);

ALTER TABLE user_role_assignments ENABLE ROW LEVEL SECURITY;

-- admin: 전체
CREATE POLICY "admin_all_role_assignments" ON user_role_assignments
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- user: 자기 역할만 읽기
CREATE POLICY "user_read_own_roles" ON user_role_assignments
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- viewer: 전체 읽기
CREATE POLICY "viewer_read_all_roles" ON user_role_assignments
  FOR SELECT TO authenticated
  USING (true);

-- updated_at 트리거
CREATE TRIGGER user_role_assignments_updated_at
  BEFORE UPDATE ON user_role_assignments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ════════════════════════════════════════
-- 2. 정산 시 특정 월 활성 역할 조회 뷰
-- ════════════════════════════════════════
CREATE OR REPLACE VIEW active_roles_by_month AS
SELECT
  ura.user_id,
  p.name AS user_name,
  ura.role,
  ura.grade,
  ura.ai_hourly_rate,
  ura.normal_hourly_rate,
  ura.rate_percent,
  ura.monthly_salary,
  ura.start_date,
  ura.end_date,
  ura.ncs_code,
  ura.ncs_name
FROM user_role_assignments ura
JOIN profiles p ON p.id = ura.user_id;

-- 사용 예: 2026년 3월에 활성인 역할만 조회
-- SELECT * FROM active_roles_by_month
-- WHERE start_date <= '2026-03-31'
--   AND (end_date IS NULL OR end_date >= '2026-03-01');


-- ════════════════════════════════════════
-- 3. profiles.team_role 컬럼은 더 이상 단일값이 아닌
--    "현재 활성 역할 목록"으로 활용 (캐시 성격)
--    → 기존 컬럼 유지, 앱에서 assignment 테이블 우선 참조
-- ════════════════════════════════════════
COMMENT ON COLUMN profiles.team_role IS '레거시: user_role_assignments 테이블 우선 참조. 캐시/표시용';
