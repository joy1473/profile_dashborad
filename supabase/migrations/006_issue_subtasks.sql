CREATE TABLE issue_subtasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  is_done BOOLEAN NOT NULL DEFAULT false,
  assignee_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  assignee_name TEXT,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_subtasks_issue_id ON issue_subtasks(issue_id);
CREATE INDEX idx_subtasks_assignee_id ON issue_subtasks(assignee_id);

ALTER TABLE issue_subtasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read subtasks"
  ON issue_subtasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert subtasks"
  ON issue_subtasks FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update subtasks"
  ON issue_subtasks FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete subtasks"
  ON issue_subtasks FOR DELETE TO authenticated USING (true);
