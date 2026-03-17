"use client";

import type { ProposalData } from "@/types/bid";
import { DynamicRows, type ColumnDef } from "../dynamic-rows";

interface StepCostProps {
  data: ProposalData;
  onChange: (data: ProposalData) => void;
}

const COST_COLUMNS: ColumnDef[] = [
  { key: "item", label: "항목", type: "text" },
  { key: "qty", label: "수량", type: "number", width: "80px" },
  { key: "unitPrice", label: "단가", type: "number", width: "120px" },
  { key: "amount", label: "금액", type: "number", width: "120px", readOnly: true },
];

export function StepCost({ data, onChange }: StepCostProps) {
  const total = data.costs.reduce((sum, c) => sum + (c.amount || 0), 0);
  const vat = data.vatIncluded ? Math.round(total * 0.1) : 0;

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">비용</h3>

      <DynamicRows
        columns={COST_COLUMNS}
        rows={data.costs}
        onChange={(rows) => onChange({ ...data, costs: rows as ProposalData["costs"] })}
        autoCalc={{ qtyKey: "qty", priceKey: "unitPrice", amountKey: "amount" }}
        showTotal={{ label: "합계", sumKey: "amount" }}
      />

      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
          <input
            type="checkbox"
            checked={data.vatIncluded}
            onChange={(e) => onChange({ ...data, vatIncluded: e.target.checked })}
            className="rounded border-zinc-300"
          />
          부가세 포함
        </label>
        {data.vatIncluded && (
          <span className="text-sm text-zinc-500">
            부가세: {vat.toLocaleString()}원 / 총액: {(total + vat).toLocaleString()}원
          </span>
        )}
      </div>
    </div>
  );
}
