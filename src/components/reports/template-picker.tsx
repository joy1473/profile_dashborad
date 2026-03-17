"use client";

import { BarChart3, Users, Settings2 } from "lucide-react";
import { REPORT_TEMPLATES } from "@/lib/report-templates";
import type { ReportTemplate } from "@/types/report";

const ICONS: Record<string, React.ReactNode> = {
  revenue: <BarChart3 size={20} />,
  users: <Users size={20} />,
  custom: <Settings2 size={20} />,
};

interface TemplatePickerProps {
  selectedId: string | null;
  onSelect: (template: ReportTemplate) => void;
}

export function TemplatePicker({ selectedId, onSelect }: TemplatePickerProps) {
  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
        템플릿 선택
      </h4>
      <div className="grid grid-cols-3 gap-2">
        {REPORT_TEMPLATES.map((tmpl) => (
          <button
            key={tmpl.id}
            onClick={() => onSelect(tmpl)}
            className={`flex flex-col items-center gap-1.5 rounded-lg border px-3 py-3 text-xs font-medium transition-colors ${
              selectedId === tmpl.id
                ? "border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-950 dark:text-blue-300"
                : "border-zinc-200 text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
            }`}
          >
            {ICONS[tmpl.id] ?? <Settings2 size={20} />}
            {tmpl.name}
          </button>
        ))}
      </div>
    </div>
  );
}
