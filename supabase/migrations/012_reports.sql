-- reports: 리포트 저장
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID REFERENCES issues(id) ON DELETE SET NULL,
  template_id TEXT NOT NULL,
  title TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '[]',
  chart_config JSONB NOT NULL DEFAULT '[]',
  qa_responses JSONB DEFAULT '[]',
  version INTEGER NOT NULL DEFAULT 1,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_reports_issue_id ON reports(issue_id);

-- report_histories: 리포트 수정 이력
CREATE TABLE report_histories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  data JSONB NOT NULL,
  chart_config JSONB NOT NULL,
  qa_responses JSONB DEFAULT '[]',
  change_note TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_report_histories_report_id ON report_histories(report_id);

-- RLS
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_histories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reports_select" ON reports
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "reports_insert" ON reports
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "reports_update" ON reports
  FOR UPDATE TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "reports_delete" ON reports
  FOR DELETE TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "report_histories_select" ON report_histories
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "report_histories_insert" ON report_histories
  FOR INSERT TO authenticated WITH CHECK (true);
