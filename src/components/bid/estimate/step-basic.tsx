"use client";

import type { EstimateData } from "@/types/bid";

interface EstStepBasicProps {
  data: EstimateData;
  onChange: (data: EstimateData) => void;
}

export function EstStepBasic({ data, onChange }: EstStepBasicProps) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">견적서 기본 정보</h3>

      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">견적 제목 *</label>
        <input
          type="text"
          value={data.title}
          onChange={(e) => onChange({ ...data, title: e.target.value })}
          className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          placeholder="견적서 제목"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">견적일</label>
          <input
            type="date"
            value={data.date}
            onChange={(e) => onChange({ ...data, date: e.target.value })}
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">유효기간</label>
          <input
            type="date"
            value={data.validUntil}
            onChange={(e) => onChange({ ...data, validUntil: e.target.value })}
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
        </div>
      </div>

      <hr className="border-zinc-200 dark:border-zinc-700" />
      <h4 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">수신처</h4>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">회사명</label>
          <input
            type="text"
            value={data.recipient.company}
            onChange={(e) => onChange({ ...data, recipient: { ...data.recipient, company: e.target.value } })}
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">담당자</label>
          <input
            type="text"
            value={data.recipient.contact}
            onChange={(e) => onChange({ ...data, recipient: { ...data.recipient, contact: e.target.value } })}
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
        </div>
      </div>

      <hr className="border-zinc-200 dark:border-zinc-700" />
      <h4 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">발신처</h4>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">회사명</label>
          <input
            type="text"
            value={data.sender.company}
            onChange={(e) => onChange({ ...data, sender: { ...data.sender, company: e.target.value } })}
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">대표자</label>
          <input
            type="text"
            value={data.sender.ceo}
            onChange={(e) => onChange({ ...data, sender: { ...data.sender, ceo: e.target.value } })}
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">연락처</label>
          <input
            type="text"
            value={data.sender.phone}
            onChange={(e) => onChange({ ...data, sender: { ...data.sender, phone: e.target.value } })}
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
        </div>
      </div>
    </div>
  );
}
