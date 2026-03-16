-- issue_attachments 테이블
CREATE TABLE issue_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL DEFAULT 0,
  content_type TEXT NOT NULL DEFAULT 'application/octet-stream',
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE issue_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read attachments"
  ON issue_attachments FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert attachments"
  ON issue_attachments FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can delete attachments"
  ON issue_attachments FOR DELETE TO authenticated USING (true);

-- Storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('issue-attachments', 'issue-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Authenticated users can upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'issue-attachments');

CREATE POLICY "Anyone can read attachments"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'issue-attachments');

CREATE POLICY "Authenticated users can delete attachments"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'issue-attachments');
