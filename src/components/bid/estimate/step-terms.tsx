"use client";

import type { EstimateData } from "@/types/bid";

interface EstStepTermsProps {
  data: EstimateData;
  onChange: (data: EstimateData) => void;
}

export function EstStepTerms({ data, onChange }: EstStepTermsProps) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">조건 / 비고</h3>

      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">납품 조건</label>
        <textarea
          value={data.deliveryTerms}
          onChange={(e) => onChange({ ...data, deliveryTerms: e.target.value })}
          rows={3}
          className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          placeholder="납품 장소, 납기일 등"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">결제 조건</label>
        <textarea
          value={data.paymentTerms}
          onChange={(e) => onChange({ ...data, paymentTerms: e.target.value })}
          rows={3}
          className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          placeholder="결제 방법, 시기 등"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">비고</label>
        <textarea
          value={data.notes}
          onChange={(e) => onChange({ ...data, notes: e.target.value })}
          rows={3}
          className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          placeholder="기타 참고 사항..."
        />
      </div>
    </div>
  );
}
