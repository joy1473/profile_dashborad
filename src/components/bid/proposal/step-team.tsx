"use client";

import type { ProposalData } from "@/types/bid";
import { DynamicRows, type ColumnDef } from "../dynamic-rows";

interface StepTeamProps {
  data: ProposalData;
  onChange: (data: ProposalData) => void;
}

const TEAM_COLUMNS: ColumnDef[] = [
  { key: "name", label: "성명", type: "text" },
  { key: "role", label: "역할", type: "text" },
  { key: "grade", label: "등급", type: "text", width: "100px" },
  { key: "period", label: "투입 기간", type: "text", width: "120px" },
];

export function StepTeam({ data, onChange }: StepTeamProps) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">투입 인력</h3>

      <DynamicRows
        columns={TEAM_COLUMNS}
        rows={data.team}
        onChange={(rows) => onChange({ ...data, team: rows as ProposalData["team"] })}
      />
    </div>
  );
}
