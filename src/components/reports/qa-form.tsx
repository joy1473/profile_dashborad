"use client";

import { useState } from "react";
import { MessageCircleQuestion, Check, SkipForward } from "lucide-react";
import type { FieldDef, QaResponse } from "@/types/report";

interface QaFormProps {
  missingFields: FieldDef[];
  onSubmit: (responses: QaResponse[]) => void;
  onSkip: () => void;
}

export function QaForm({ missingFields, onSubmit, onSkip }: QaFormProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({});

  function handleChange(key: string, value: string) {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit() {
    const responses: QaResponse[] = Object.entries(answers)
      .filter(([, v]) => v.trim() !== "")
      .map(([key, answer]) => {
        const field = missingFields.find((f) => f.key === key);
        return {
          fieldKey: key,
          question: field?.question ?? "",
          answer,
          answeredAt: new Date().toISOString(),
        };
      });
    onSubmit(responses);
  }

  if (missingFields.length === 0) return null;

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950">
      <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-amber-800 dark:text-amber-200">
        <MessageCircleQuestion size={16} />
        추가 데이터가 필요합니다
      </h4>
      <p className="mb-4 text-xs text-amber-600 dark:text-amber-400">
        첨부 파일에서 아래 데이터를 찾을 수 없습니다. 직접 입력하거나 건너뛸 수 있습니다.
      </p>
      <div className="space-y-3">
        {missingFields.map((field) => (
          <div key={field.key}>
            <label className="mb-1 block text-xs font-medium text-amber-700 dark:text-amber-300">
              {field.label} ({field.key})
            </label>
            <p className="mb-1.5 text-xs text-amber-600 dark:text-amber-400">
              {field.question}
            </p>
            <textarea
              value={answers[field.key] ?? ""}
              onChange={(e) => handleChange(field.key, e.target.value)}
              placeholder={`여러 값은 줄바꿈으로 구분\n예: 100\n200\n300`}
              rows={3}
              className="w-full rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm dark:border-amber-700 dark:bg-zinc-900 dark:text-zinc-50"
            />
          </div>
        ))}
      </div>
      <div className="mt-4 flex gap-2">
        <button
          onClick={handleSubmit}
          className="flex items-center gap-1.5 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
        >
          <Check size={14} />
          적용
        </button>
        <button
          onClick={onSkip}
          className="flex items-center gap-1.5 rounded-lg border border-amber-300 px-4 py-2 text-sm text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-300"
        >
          <SkipForward size={14} />
          건너뛰기
        </button>
      </div>
    </div>
  );
}
