-- 과정별 인력 배당 + 정산 테이블
-- 핵심: "사람에게 역할 배정"이 아닌 "과정(일)에 사람 배당"

-- ════════════════════════════════════════
-- 1. course_staff_assignments (과정별 인력 배당)
-- ════════════════════════════════════════
CREATE TABLE IF NOT EXISTS course_staff_assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES course_runs(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),

  -- 외부 인력 (user_id 없는 경우)
  external_name TEXT DEFAULT '',
  external_contact TEXT DEFAULT '',

  -- 역할
  role TEXT NOT NULL CHECK (role IN ('강사','영업','행정','관리자','운영비')),
  grade TEXT DEFAULT '',

  -- 단가/배분
  hours NUMERIC(6,1) DEFAULT 0,           -- 투입 시간
  unit_price INTEGER DEFAULT 0,            -- 시간당 단가 (천원) — 강사용
  rate_percent NUMERIC(5,2) DEFAULT 0,     -- 배분율 (%) — 영업/행정용

  -- 세금 유형
  payment_type TEXT NOT NULL DEFAULT '3.3%'
    CHECK (payment_type IN ('3.3%', '세금계산서', '기타소득8.8%')),

  -- 금액 (자동 계산 또는 수동 입력)
  gross_amount INTEGER DEFAULT 0,          -- 총 지급액 (세전)
  tax_amount INTEGER DEFAULT 0,            -- 세금 (원천징수 또는 VAT)
  net_amount INTEGER DEFAULT 0,            -- 실지급액 (강사 수령)
  org_cost INTEGER DEFAULT 0,              -- 기관 실부담 (세금계산서: gross+VAT)

  -- 정산 상태
  status TEXT NOT NULL DEFAULT '배당'
    CHECK (status IN ('배당','강의완료','입금대기','입금완료','정산완료')),
  paid_at DATE,                            -- 실제 지급일

  -- 메모
  notes TEXT DEFAULT '',

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_course_staff_course ON course_staff_assignments(course_id);
CREATE INDEX idx_course_staff_user ON course_staff_assignments(user_id);
CREATE INDEX idx_course_staff_status ON course_staff_assignments(status);

ALTER TABLE course_staff_assignments ENABLE ROW LEVEL SECURITY;

-- admin: 전체
CREATE POLICY "admin_all_course_staff" ON course_staff_assignments
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- user: 자기 배당 읽기
CREATE POLICY "user_read_own_staff" ON course_staff_assignments
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- viewer: 전체 읽기
CREATE POLICY "viewer_read_all_staff" ON course_staff_assignments
  FOR SELECT TO authenticated
  USING (true);

-- updated_at 트리거
CREATE TRIGGER course_staff_updated_at
  BEFORE UPDATE ON course_staff_assignments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ════════════════════════════════════════
-- 2. course_runs 상태 확장
-- ════════════════════════════════════════
ALTER TABLE course_runs DROP CONSTRAINT IF EXISTS course_runs_status_check;
ALTER TABLE course_runs ADD CONSTRAINT course_runs_status_check
  CHECK (status IN ('계약','개설','진행중','수료','입금대기','입금완료','정산완료','예정','완료','취소'));
