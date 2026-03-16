CREATE TABLE subtask_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subtask_id UUID NOT NULL REFERENCES issue_subtasks(id) ON DELETE CASCADE,
  issue_id UUID NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
  action TEXT NOT NULL,          -- 'created', 'title_changed', 'assignee_changed', 'completed', 'reopened', 'deleted'
  old_value TEXT,
  new_value TEXT,
  actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  actor_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_subtask_activities_issue_id ON subtask_activities(issue_id);
CREATE INDEX idx_subtask_activities_subtask_id ON subtask_activities(subtask_id);

ALTER TABLE subtask_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read subtask activities"
  ON subtask_activities FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert subtask activities"
  ON subtask_activities FOR INSERT TO authenticated WITH CHECK (true);
