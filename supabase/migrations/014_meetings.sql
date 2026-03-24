-- meetings 테이블: 화상회의 관리
CREATE TABLE IF NOT EXISTS meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  room_name TEXT NOT NULL UNIQUE,
  host_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  host_name TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'ended')),
  participants TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ
);

-- RLS
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "meetings_select" ON meetings
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "meetings_insert" ON meetings
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = host_id);

CREATE POLICY "meetings_update" ON meetings
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "meetings_delete" ON meetings
  FOR DELETE TO authenticated USING (auth.uid() = host_id);
