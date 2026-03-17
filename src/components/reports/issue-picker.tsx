"use client";

import { useState, useEffect } from "react";
import { FileText, Paperclip, ChevronRight } from "lucide-react";
import { fetchIssues } from "@/lib/issues";
import { fetchAttachments } from "@/lib/attachments";
import { isParsableFile } from "@/lib/csv-parser";
import type { Issue } from "@/types/issue";
import type { Attachment } from "@/types/attachment";
import { formatFileSize } from "@/lib/attachments";

interface IssuePickerProps {
  onSelectFile: (attachment: Attachment) => void;
  selectedIssueId: string | null;
  onSelectIssue: (issue: Issue) => void;
}

export function IssuePicker({ onSelectFile, selectedIssueId, onSelectIssue }: IssuePickerProps) {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchIssues().then((data) => {
      setIssues(data);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (selectedIssueId) {
      fetchAttachments(selectedIssueId).then(setAttachments);
    } else {
      setAttachments([]);
    }
  }, [selectedIssueId]);

  const statusLabel: Record<string, string> = {
    todo: "할 일",
    in_progress: "진행 중",
    in_review: "검토 중",
    done: "완료",
  };

  if (loading) {
    return <div className="py-6 text-center text-sm text-zinc-400">이슈 로딩 중...</div>;
  }

  return (
    <div className="space-y-1">
      <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
        <FileText size={12} />
        Board 이슈
      </h4>

      {issues.length === 0 ? (
        <p className="text-sm text-zinc-400">이슈가 없습니다</p>
      ) : (
        <div className="space-y-1 max-h-[280px] overflow-y-auto">
          {issues.map((issue) => (
            <div key={issue.id}>
              <button
                onClick={() => onSelectIssue(issue)}
                className={`w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors ${
                  selectedIssueId === issue.id
                    ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                    : "text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
                }`}
              >
                <ChevronRight
                  size={14}
                  className={`shrink-0 transition-transform ${
                    selectedIssueId === issue.id ? "rotate-90" : ""
                  }`}
                />
                <span className="truncate flex-1">{issue.title}</span>
                <span className="shrink-0 text-[10px] text-zinc-400">
                  {statusLabel[issue.status]}
                </span>
              </button>

              {selectedIssueId === issue.id && (
                <div className="ml-6 mt-1 space-y-1">
                  {attachments.length === 0 ? (
                    <p className="text-xs text-zinc-400 py-1">첨부 파일 없음</p>
                  ) : (
                    attachments.map((att) => {
                      const parsable = isParsableFile(att.content_type, att.file_name);
                      return (
                        <button
                          key={att.id}
                          onClick={() => parsable && onSelectFile(att)}
                          disabled={!parsable}
                          className={`w-full flex items-center gap-2 rounded px-2 py-1.5 text-left text-xs transition-colors ${
                            parsable
                              ? "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                              : "text-zinc-300 cursor-not-allowed dark:text-zinc-600"
                          }`}
                          title={parsable ? "파일 파싱" : "CSV/JSON만 지원"}
                        >
                          <Paperclip size={12} className="shrink-0" />
                          <span className="truncate flex-1">{att.file_name}</span>
                          <span className="shrink-0 text-zinc-400">
                            {formatFileSize(att.file_size)}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
