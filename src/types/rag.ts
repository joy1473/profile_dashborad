export interface RagDocument {
  id: string;
  owner_id: string;
  name: string;
  description: string;
  current_version_id: string | null;
  section_count: number;
  created_at: string;
  updated_at: string;
}

export interface RagVersion {
  id: string;
  document_id: string;
  version_label: string;
  version_number: number;
  html_content: string;
  html_size_bytes: number;
  created_by: string;
  created_via: "manual" | "ai_edit" | "restore" | "initial";
  chat_message_id: string | null;
  created_at: string;
}

export interface RagSection {
  id: string;
  document_id: string;
  version_id: string;
  section_index: number;
  element_id: string | null;
  element_tag: string;
  heading_text: string | null;
  char_count: number;
  html_fragment: string;
  created_at: string;
}

export interface RagReferenceFile {
  id: string;
  document_id: string;
  uploaded_by: string;
  source_type: "file" | "url";
  filename: string | null;
  file_type: string | null;
  file_size_bytes: number;
  storage_path: string | null;
  source_url: string | null;
  extracted_text: string | null;
  extraction_status: "pending" | "processing" | "ready" | "parse_error" | "crawl_error";
  error_message: string | null;
  created_at: string;
}

export interface RagChatMessage {
  id: string;
  session_id: string;
  document_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  token_count: number;
  targeted_section_id: string | null;
  version_created_id: string | null;
  created_at: string;
}

export interface RagChatSession {
  id: string;
  document_id: string;
  user_id: string;
  started_at: string;
  last_active_at: string;
  total_tokens_used: number;
}
