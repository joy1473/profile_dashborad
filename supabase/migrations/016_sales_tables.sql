-- 영업관리 테이블: 리드, 교육과정, 정산
-- 역할별 접근제어 (RLS)

-- ════════════════════════════════════════
-- 1. sales_leads (영업 리드)
-- ════════════════════════════════════════
CREATE TABLE IF NOT EXISTS sales_leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company TEXT NOT NULL,
  contact TEXT NOT NULL DEFAULT '',
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  region TEXT DEFAULT '',
  employee_count INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT '신규'
    CHECK (status IN ('신규','접촉중','제안','협상','계약','완료','보류')),
  course_type TEXT NOT NULL DEFAULT 'AI_6H'
    CHECK (course_type IN ('AI_6H','AI_40H','일반')),
  expected_revenue INTEGER DEFAULT 0,
  assigned_to UUID REFERENCES profiles(id),
  notes TEXT DEFAULT '',
  created_by UUID NOT NULL DEFAULT auth.uid() REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE sales_leads ENABLE ROW LEVEL SECURITY;

-- admin: 전체 CRUD
CREATE POLICY "admin_all_leads" ON sales_leads
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- user(영업): 자기가 만든 리드 + 자기에게 배정된 리드
CREATE POLICY "user_own_leads" ON sales_leads
  FOR ALL TO authenticated
  USING (
    created_by = auth.uid()
    OR assigned_to = auth.uid()
  )
  WITH CHECK (
    created_by = auth.uid()
  );

-- viewer: 읽기만
CREATE POLICY "viewer_read_leads" ON sales_leads
  FOR SELECT TO authenticated
  USING (true);


-- ════════════════════════════════════════
-- 2. course_runs (교육 과정)
-- ════════════════════════════════════════
CREATE TABLE IF NOT EXISTS course_runs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  course_type TEXT NOT NULL DEFAULT 'AI_6H'
    CHECK (course_type IN ('AI_6H','AI_40H','일반')),
  start_date DATE,
  end_date DATE,
  students INTEGER DEFAULT 0,
  hours INTEGER DEFAULT 0,
  revenue INTEGER DEFAULT 0,
  gov_support INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT '예정'
    CHECK (status IN ('예정','진행중','완료','취소')),
  lead_id UUID REFERENCES sales_leads(id) ON DELETE SET NULL,
  instructor_id UUID REFERENCES profiles(id),
  created_by UUID NOT NULL DEFAULT auth.uid() REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE course_runs ENABLE ROW LEVEL SECURITY;

-- admin: 전체
CREATE POLICY "admin_all_courses" ON course_runs
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- user: 자기가 만든 과정 + 강사로 배정된 과정
CREATE POLICY "user_own_courses" ON course_runs
  FOR ALL TO authenticated
  USING (
    created_by = auth.uid()
    OR instructor_id = auth.uid()
  )
  WITH CHECK (
    created_by = auth.uid()
  );

-- viewer: 읽기만
CREATE POLICY "viewer_read_courses" ON course_runs
  FOR SELECT TO authenticated
  USING (true);


-- ════════════════════════════════════════
-- 3. settlements (월간 정산)
-- ════════════════════════════════════════
CREATE TABLE IF NOT EXISTS settlements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  year_month TEXT NOT NULL,
  total_revenue INTEGER DEFAULT 0,
  created_by UUID NOT NULL DEFAULT auth.uid() REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE settlements ENABLE ROW LEVEL SECURITY;

-- admin만 정산 생성/수정
CREATE POLICY "admin_all_settlements" ON settlements
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- user/viewer: 읽기만
CREATE POLICY "read_settlements" ON settlements
  FOR SELECT TO authenticated
  USING (true);


-- ════════════════════════════════════════
-- 4. settlement_items (정산 상세)
-- ════════════════════════════════════════
CREATE TABLE IF NOT EXISTS settlement_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  settlement_id UUID NOT NULL REFERENCES settlements(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('영업','강사','행정','관리자')),
  user_id UUID REFERENCES profiles(id),
  name TEXT NOT NULL,
  ratio NUMERIC(5,2) DEFAULT 0,
  amount INTEGER DEFAULT 0,
  hours INTEGER DEFAULT 0,
  mm NUMERIC(5,2) DEFAULT 0
);

ALTER TABLE settlement_items ENABLE ROW LEVEL SECURITY;

-- admin: 전체
CREATE POLICY "admin_all_settlement_items" ON settlement_items
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- 본인 항목만 읽기
CREATE POLICY "user_own_settlement_items" ON settlement_items
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );


-- ════════════════════════════════════════
-- 5. profiles 테이블에 team_role 컬럼 추가
-- ════════════════════════════════════════
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS team_role TEXT DEFAULT ''
  CHECK (team_role IN ('', '영업', '강사', '행정', '관리자'));


-- ════════════════════════════════════════
-- 6. updated_at 자동 갱신 트리거
-- ════════════════════════════════════════
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sales_leads_updated_at
  BEFORE UPDATE ON sales_leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER course_runs_updated_at
  BEFORE UPDATE ON course_runs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
