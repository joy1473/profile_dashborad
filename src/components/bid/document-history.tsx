"use client";

import { Clock, RotateCcw } from "lucide-react";
import type { ReportHistory } from "@/types/report";

interface DocumentHistoryProps {
  histories: ReportHistory[];
  currentVersion: number;
  onRestore: (history: ReportHistory) => void;
}

export function DocumentHistory({ histories, currentVersion, onRestore }: DocumentHistoryProps) {
  if (histories.length === 0) return null;

  function formatTime(iso: string) {
    const d = new Date(iso);
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
  }

  return (
    <div className="space-y-1">
      <h4 className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
        <Clock size={12} />
        이력 (현재 v{currentVersion})
      </h4>
      <div className="space-y-1 max-h-[160px] overflow-y-auto">
        {histories.map((h) => (
          <div
            key={h.id}
            className="flex items-center justify-between rounded px-2.5 py-1.5 text-xs text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800"
          >
            <span>
              v{h.version} · {formatTime(h.created_at)}
              {h.change_note && <span className="ml-1 text-zinc-400">({h.change_note})</span>}
            </span>
            <button
              onClick={() => onRestore(h)}
              className="rounded p-1 text-zinc-400 hover:text-blue-500"
              title="이 버전으로 복원"
            >
              <RotateCcw size={12} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
