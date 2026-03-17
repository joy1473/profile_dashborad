"use client";

import type { EstimateData } from "@/types/bid";
import { DynamicRows, type ColumnDef } from "../dynamic-rows";

interface EstStepItemsProps {
  data: EstimateData;
  onChange: (data: EstimateData) => void;
}

const ITEM_COLUMNS: ColumnDef[] = [
  { key: "name", label: "품목", type: "text" },
  { key: "spec", label: "규격", type: "text" },
  { key: "qty", label: "수량", type: "number", width: "80px" },
  { key: "unitPrice", label: "단가", type: "number", width: "120px" },
  { key: "amount", label: "금액", type: "number", width: "120px", readOnly: true },
];

export function EstStepItems({ data, onChange }: EstStepItemsProps) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">견적 항목</h3>

      <DynamicRows
        columns={ITEM_COLUMNS}
        rows={data.items}
        onChange={(rows) => onChange({ ...data, items: rows as EstimateData["items"] })}
        autoCalc={{ qtyKey: "qty", priceKey: "unitPrice", amountKey: "amount" }}
        showTotal={{ label: "합계", sumKey: "amount" }}
      />
    </div>
  );
}
