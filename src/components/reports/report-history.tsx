"use client";

import { Clock, Eye } from "lucide-react";
import type { ReportHistory } from "@/types/report";

interface ReportHistoryListProps {
  histories: ReportHistory[];
  currentVersion: number;
  onPreview: (history: ReportHistory) => void;
}

export function ReportHistoryList({ histories, currentVersion, onPreview }: ReportHistoryListProps) {
  if (histories.length === 0) return null;

  function formatTime(iso: string) {
    const d = new Date(iso);
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
  }

  return (
    <div className="space-y-2">
      <h4 className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
        <Clock size={12} />
        수정 이력
      </h4>

      <div className="text-xs text-zinc-500 mb-1">
        현재 버전: v{currentVersion}
      </div>

      <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
        {histories.map((h) => (
          <div
            key={h.id}
            className="flex items-center justify-between rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-700"
          >
            <div>
              <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                v{h.version}
              </span>
              <span className="ml-2 text-xs text-zinc-400">
                {formatTime(h.created_at)}
              </span>
              {h.change_note && (
                <p className="text-xs text-zinc-500 mt-0.5">{h.change_note}</p>
              )}
            </div>
            <button
              onClick={() => onPreview(h)}
              className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800"
              title="이 버전 미리보기"
            >
              <Eye size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
