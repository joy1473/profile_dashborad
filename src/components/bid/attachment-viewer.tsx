"use client";

import { useState, useEffect } from "react";
import { Paperclip, Download, FileText } from "lucide-react";
import { fetchAttachments, getSignedDownloadUrl, formatFileSize } from "@/lib/attachments";
import type { Attachment } from "@/types/attachment";

interface AttachmentViewerProps {
  issueId: string | null;
}

export function AttachmentViewer({ issueId }: AttachmentViewerProps) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  useEffect(() => {
    if (issueId) {
      fetchAttachments(issueId).then(setAttachments);
    } else {
      setAttachments([]);
    }
  }, [issueId]);

  if (!issueId || attachments.length === 0) return null;

  async function handleDownload(att: Attachment) {
    const url = await getSignedDownloadUrl(att.file_path);
    if (url) window.open(url, "_blank");
  }

  return (
    <div className="space-y-1">
      <h4 className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
        <Paperclip size={12} />
        첨부 파일 참조
      </h4>
      <div className="space-y-1">
        {attachments.map((att) => (
          <button
            key={att.id}
            onClick={() => handleDownload(att)}
            className="w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-800 transition-colors"
          >
            <FileText size={14} className="shrink-0 text-zinc-400" />
            <span className="truncate flex-1">{att.file_name}</span>
            <span className="shrink-0 text-zinc-400">{formatFileSize(att.file_size)}</span>
            <Download size={12} className="shrink-0 text-zinc-300" />
          </button>
        ))}
      </div>
    </div>
  );
}
