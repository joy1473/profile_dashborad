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
