"use client";

import { X, User, Zap, FolderOpen, GraduationCap, Award, FileText, Briefcase, Wrench } from "lucide-react";
import type { SelectedNode } from "@/types/graph";

const TYPE_ICONS: Record<string, typeof User> = {
  person: User,
  skill: Zap,
  project: FolderOpen,
  education: GraduationCap,
  certificate: Award,
  document: FileText,
  role: Briefcase,
  tool: Wrench,
};

const TYPE_LABELS: Record<string, string> = {
  person: "사람",
  skill: "스킬",
  project: "프로젝트",
  education: "교육",
  certificate: "자격증",
  document: "문서",
  role: "역할",
  tool: "도구",
};

const META_LABELS: Record<string, string> = {
  category: "카테고리",
  level: "수준",
  tech: "기술스택",
  status: "상태",
  description: "설명",
  provider: "교육기관",
  issuer: "발급기관",
  date: "날짜",
  hours: "시간(h)",
  department: "부서",
  email: "이메일",
  type: "유형",
};

const LEVEL_LABELS: Record<string, string> = {
  high: "상",
  medium: "중",
  low: "하",
};

interface NodeDetailPanelProps {
  node: SelectedNode;
  onClose: () => void;
}

export function NodeDetailPanel({ node, onClose }: NodeDetailPanelProps) {
  if (!node) return null;

  const Icon = TYPE_ICONS[node.type] ?? User;
  const meta = node.meta ?? {};
  const metaEntries = Object.entries(meta).filter(
    ([k, v]) => !["id", "name", "title", "userId", "avatarUrl", "elementId"].includes(k) && v !== undefined && v !== ""
  );

  return (
    <div
      className="rounded-lg border border-zinc-200 bg-white p-4 shadow-lg dark:border-zinc-700 dark:bg-zinc-800"
      data-testid="node-detail-panel"
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon size={18} className="text-zinc-500" />
          <span className="text-xs font-medium text-zinc-400">
            {TYPE_LABELS[node.type] ?? node.type}
          </span>
        </div>
        <button
          onClick={onClose}
          className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-700 dark:hover:text-zinc-300"
        >
          <X size={16} />
        </button>
      </div>

      <h3 className="mb-3 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        {node.name}
      </h3>

      {metaEntries.length > 0 && (
        <dl className="space-y-1.5">
          {metaEntries.map(([key, value]) => (
            <div key={key} className="flex items-baseline gap-2 text-sm">
              <dt className="min-w-[70px] font-medium text-zinc-500 dark:text-zinc-400">
                {META_LABELS[key] ?? key}
              </dt>
              <dd className="text-zinc-900 dark:text-zinc-100">
                {key === "level" ? LEVEL_LABELS[String(value)] ?? value : String(value)}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
