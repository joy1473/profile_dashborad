export interface Attachment {
  id: string;
  issue_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  content_type: string;
  uploaded_by: string | null;
  created_at: string;
}
