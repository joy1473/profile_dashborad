"use client";

import type { ProposalData } from "@/types/bid";

interface StepTechProps {
  data: ProposalData;
  onChange: (data: ProposalData) => void;
}

export function StepTech({ data, onChange }: StepTechProps) {
  function set<K extends keyof ProposalData>(key: K, value: ProposalData[K]) {
    onChange({ ...data, [key]: value });
  }

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">기술 방안</h3>

      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">사업 이해도</label>
        <textarea
          value={data.understanding}
          onChange={(e) => set("understanding", e.target.value)}
          rows={4}
          className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          placeholder="사업 배경 및 목적, 현황 분석..."
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">추진 전략</label>
        <textarea
          value={data.strategy}
          onChange={(e) => set("strategy", e.target.value)}
          rows={4}
          className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          placeholder="핵심 추진 전략 및 방법론..."
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">시스템 구성도</label>
        <textarea
          value={data.systemDiagram}
          onChange={(e) => set("systemDiagram", e.target.value)}
          rows={3}
          className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          placeholder="시스템 아키텍처 설명 (텍스트 또는 다이어그램 URL)..."
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">세부 기술 방안</label>
        <textarea
          value={data.techDetail}
          onChange={(e) => set("techDetail", e.target.value)}
          rows={5}
          className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          placeholder="기술 스택, 개발 방법, 품질 관리 방안..."
        />
      </div>
    </div>
  );
}
