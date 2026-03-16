import { supabase } from "./supabase";
import type { Attachment } from "@/types/attachment";

const BUCKET = "issue-attachments";

export async function fetchAttachments(issueId: string): Promise<Attachment[]> {
  const { data, error } = await supabase
    .from("issue_attachments")
    .select("*")
    .eq("issue_id", issueId)
    .order("created_at", { ascending: false });

  if (error) return [];
  return data ?? [];
}

export async function uploadAttachment(
  issueId: string,
  file: File,
): Promise<Attachment> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const filePath = `${issueId}/${timestamp}_${safeName}`;

  // 1. Upload to Storage
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, file, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (uploadError) throw new Error(`업로드 실패: ${uploadError.message}`);

  // 2. Insert metadata
  const { data, error } = await supabase
    .from("issue_attachments")
    .insert({
      issue_id: issueId,
      file_name: file.name,
      file_path: filePath,
      file_size: file.size,
      content_type: file.type || "application/octet-stream",
      uploaded_by: user?.id ?? null,
    })
    .select()
    .single();

  if (error) throw new Error(`메타데이터 저장 실패: ${error.message}`);
  return data;
}

export async function deleteAttachment(attachment: Attachment): Promise<void> {
  // 1. Delete from Storage
  await supabase.storage.from(BUCKET).remove([attachment.file_path]);

  // 2. Delete metadata
  await supabase.from("issue_attachments").delete().eq("id", attachment.id);
}

export function getPublicDownloadUrl(filePath: string): string {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(filePath, {
    download: true,
  });
  return data.publicUrl;
}

export async function getSignedDownloadUrl(filePath: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(filePath, 3600, { download: true });
  if (error) return null;
  return data.signedUrl;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
