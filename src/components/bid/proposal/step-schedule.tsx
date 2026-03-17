"use client";

import type { ProposalData } from "@/types/bid";
import { DynamicRows, type ColumnDef } from "../dynamic-rows";

interface StepScheduleProps {
  data: ProposalData;
  onChange: (data: ProposalData) => void;
}

const SCHEDULE_COLUMNS: ColumnDef[] = [
  { key: "phase", label: "단계", type: "text" },
  { key: "period", label: "기간", type: "text", width: "150px" },
  { key: "deliverable", label: "산출물", type: "text" },
];

export function StepSchedule({ data, onChange }: StepScheduleProps) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">추진 일정</h3>

      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">총 사업 기간</label>
        <input
          type="text"
          value={data.totalPeriod}
          onChange={(e) => onChange({ ...data, totalPeriod: e.target.value })}
          className="w-full max-w-md rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          placeholder="예: 2026.04 ~ 2026.09 (6개월)"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">세부 일정</label>
        <DynamicRows
          columns={SCHEDULE_COLUMNS}
          rows={data.schedule}
          onChange={(rows) => onChange({ ...data, schedule: rows as ProposalData["schedule"] })}
        />
      </div>
    </div>
  );
}
