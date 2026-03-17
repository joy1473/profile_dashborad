"use client";

import type { ProposalData } from "@/types/bid";

interface StepBasicProps {
  data: ProposalData;
  onChange: (data: ProposalData) => void;
}

export function StepBasic({ data, onChange }: StepBasicProps) {
  function set<K extends keyof ProposalData>(key: K, value: ProposalData[K]) {
    onChange({ ...data, [key]: value });
  }

  function setCompany(key: keyof ProposalData["company"], value: string) {
    onChange({ ...data, company: { ...data.company, [key]: value } });
  }

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">기본 정보</h3>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">프로젝트명 *</label>
          <input
            type="text"
            value={data.projectName}
            onChange={(e) => set("projectName", e.target.value)}
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            placeholder="프로젝트명을 입력하세요"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">발주처 *</label>
          <input
            type="text"
            value={data.clientName}
            onChange={(e) => set("clientName", e.target.value)}
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            placeholder="발주처명"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">제출일</label>
          <input
            type="date"
            value={data.submitDate}
            onChange={(e) => set("submitDate", e.target.value)}
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
        </div>
      </div>

      <hr className="border-zinc-200 dark:border-zinc-700" />
      <h4 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">제출 회사 정보</h4>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">회사명</label>
          <input
            type="text"
            value={data.company.name}
            onChange={(e) => setCompany("name", e.target.value)}
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">대표자</label>
          <input
            type="text"
            value={data.company.ceo}
            onChange={(e) => setCompany("ceo", e.target.value)}
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">연락처</label>
          <input
            type="text"
            value={data.company.phone}
            onChange={(e) => setCompany("phone", e.target.value)}
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">주소</label>
          <input
            type="text"
            value={data.company.address}
            onChange={(e) => setCompany("address", e.target.value)}
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
        </div>
      </div>
    </div>
  );
}
