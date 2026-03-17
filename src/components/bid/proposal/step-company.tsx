"use client";

import type { ProposalData } from "@/types/bid";
import { DynamicRows, type ColumnDef } from "../dynamic-rows";

interface StepCompanyProps {
  data: ProposalData;
  onChange: (data: ProposalData) => void;
}

const TRACK_RECORD_COLUMNS: ColumnDef[] = [
  { key: "project", label: "프로젝트명", type: "text" },
  { key: "client", label: "발주처", type: "text" },
  { key: "period", label: "기간", type: "text", width: "120px" },
  { key: "amount", label: "금액", type: "text", width: "120px" },
];

export function StepCompany({ data, onChange }: StepCompanyProps) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">회사 소개</h3>

      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">회사 소개문</label>
        <textarea
          value={data.companyIntro}
          onChange={(e) => onChange({ ...data, companyIntro: e.target.value })}
          rows={5}
          className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          placeholder="회사 소개를 작성하세요..."
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">주요 수행실적</label>
        <DynamicRows
          columns={TRACK_RECORD_COLUMNS}
          rows={data.trackRecord}
          onChange={(rows) => onChange({ ...data, trackRecord: rows as ProposalData["trackRecord"] })}
        />
      </div>
    </div>
  );
}
