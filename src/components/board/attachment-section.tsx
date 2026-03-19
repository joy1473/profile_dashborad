"use client";

import { useState, useRef } from "react";
import { Paperclip, Download, Trash2, Loader2 } from "lucide-react";
import type { Attachment } from "@/types/attachment";
import {
  uploadAttachment,
  deleteAttachment,
  getSignedDownloadUrl,
  formatFileSize,
} from "@/lib/attachments";

interface AttachmentSectionProps {
  issueId: string;
  attachments: Attachment[];
  onAttachmentsChange: (attachments: Attachment[]) => void;
}

export function AttachmentSection({ issueId, attachments, onAttachmentsChange }: AttachmentSectionProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files?.length) return;

    setUploading(true);
    setUploadError(null);
    try {
      const newAttachments = [...attachments];
      for (const file of Array.from(files)) {
        const attachment = await uploadAttachment(issueId, file);
        newAttachments.unshift(attachment);
      }
      onAttachmentsChange(newAttachments);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "업로드에 실패했습니다");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleDownload(att: Attachment) {
    const url = await getSignedDownloadUrl(att.file_path);
    if (url) window.open(url, "_blank");
  }

  async function handleDelete(attachment: Attachment) {
    await deleteAttachment(attachment);
    onAttachmentsChange(attachments.filter((a) => a.id !== attachment.id));
  }

  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
        첨부파일
      </label>

      <div className="mb-2">
        <input ref={fileInputRef} type="file" multiple onChange={handleFileUpload} className="hidden" />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1.5 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          {uploading ? <Loader2 size={14} className="animate-spin" /> : <Paperclip size={14} />}
          {uploading ? "업로드 중..." : "파일 첨부"}
        </button>
      </div>

      {uploadError && <p className="mb-2 text-xs text-red-500">{uploadError}</p>}

      {attachments.length > 0 && (
        <div className="space-y-1.5">
          {attachments.map((att) => (
            <div key={att.id} className="flex items-center justify-between rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-zinc-900 dark:text-zinc-100">{att.file_name}</p>
                <p className="text-xs text-zinc-400">{formatFileSize(att.file_size)}</p>
              </div>
              <div className="ml-2 flex items-center gap-1">
                <button type="button" onClick={() => handleDownload(att)} className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-blue-600 dark:hover:bg-zinc-800 dark:hover:text-blue-400" aria-label="다운로드">
                  <Download size={14} />
                </button>
                <button type="button" onClick={() => handleDelete(att)} className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-red-600 dark:hover:bg-zinc-800 dark:hover:text-red-400" aria-label="삭제">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {attachments.length === 0 && !uploading && (
        <p className="text-xs text-zinc-400">첨부된 파일이 없습니다</p>
      )}
    </div>
  );
}
