CREATE TABLE issue_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  label TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_issue_links_issue_id ON issue_links(issue_id);

ALTER TABLE issue_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read issue links"
  ON issue_links FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert issue links"
  ON issue_links FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update issue links"
  ON issue_links FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete issue links"
  ON issue_links FOR DELETE TO authenticated USING (true);
