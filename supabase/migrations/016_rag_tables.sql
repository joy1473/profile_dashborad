-- 문서RAG 기능 테이블

CREATE TABLE IF NOT EXISTS rag_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  current_version_id UUID,
  section_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rag_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES rag_documents(id) ON DELETE CASCADE,
  version_label TEXT NOT NULL,
  version_number DECIMAL NOT NULL,
  html_content TEXT NOT NULL,
  html_size_bytes INT DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_via TEXT DEFAULT 'manual',
  chat_message_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(document_id, version_label)
);

CREATE TABLE IF NOT EXISTS rag_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES rag_documents(id) ON DELETE CASCADE,
  version_id UUID NOT NULL REFERENCES rag_versions(id) ON DELETE CASCADE,
  section_index INT NOT NULL,
  element_id TEXT,
  element_tag TEXT,
  heading_text TEXT,
  char_count INT DEFAULT 0,
  html_fragment TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rag_reference_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES rag_documents(id) ON DELETE CASCADE,
  uploaded_by UUID REFERENCES auth.users(id),
  source_type TEXT NOT NULL CHECK (source_type IN ('file', 'url')),
  filename TEXT,
  file_type TEXT,
  file_size_bytes INT DEFAULT 0,
  storage_path TEXT,
  source_url TEXT,
  extracted_text TEXT,
  extraction_status TEXT DEFAULT 'pending'
    CHECK (extraction_status IN ('pending','processing','ready','parse_error','crawl_error')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rag_chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES rag_documents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  started_at TIMESTAMPTZ DEFAULT now(),
  last_active_at TIMESTAMPTZ DEFAULT now(),
  total_tokens_used INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS rag_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES rag_chat_sessions(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES rag_documents(id),
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  token_count INT DEFAULT 0,
  targeted_section_id UUID,
  version_created_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rag_collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES rag_documents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  role TEXT NOT NULL DEFAULT 'editor' CHECK (role IN ('viewer', 'editor', 'owner')),
  invited_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(document_id, user_id)
);

-- RLS
ALTER TABLE rag_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE rag_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rag_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE rag_reference_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE rag_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rag_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE rag_collaborators ENABLE ROW LEVEL SECURITY;

-- Documents: owner or collaborator can see
CREATE POLICY "rag_docs_select" ON rag_documents FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR id IN (SELECT document_id FROM rag_collaborators WHERE user_id = auth.uid()));
CREATE POLICY "rag_docs_insert" ON rag_documents FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "rag_docs_update" ON rag_documents FOR UPDATE TO authenticated USING (owner_id = auth.uid());
CREATE POLICY "rag_docs_delete" ON rag_documents FOR DELETE TO authenticated USING (owner_id = auth.uid());

-- Versions, Sections, References, Chat: accessible if user can see document
CREATE POLICY "rag_versions_select" ON rag_versions FOR SELECT TO authenticated USING (true);
CREATE POLICY "rag_versions_insert" ON rag_versions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "rag_sections_select" ON rag_sections FOR SELECT TO authenticated USING (true);
CREATE POLICY "rag_sections_insert" ON rag_sections FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "rag_refs_select" ON rag_reference_files FOR SELECT TO authenticated USING (true);
CREATE POLICY "rag_refs_insert" ON rag_reference_files FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "rag_refs_delete" ON rag_reference_files FOR DELETE TO authenticated USING (true);
CREATE POLICY "rag_sessions_all" ON rag_chat_sessions FOR ALL TO authenticated USING (user_id = auth.uid());
CREATE POLICY "rag_messages_select" ON rag_chat_messages FOR SELECT TO authenticated USING (true);
CREATE POLICY "rag_messages_insert" ON rag_chat_messages FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "rag_collabs_select" ON rag_collaborators FOR SELECT TO authenticated USING (true);
CREATE POLICY "rag_collabs_insert" ON rag_collaborators FOR INSERT TO authenticated WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_rag_versions_doc ON rag_versions(document_id, version_number DESC);
CREATE INDEX IF NOT EXISTS idx_rag_sections_ver ON rag_sections(version_id);
CREATE INDEX IF NOT EXISTS idx_rag_msgs_session ON rag_chat_messages(session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_rag_refs_doc ON rag_reference_files(document_id);
