"use client";

import { useRouter } from "next/navigation";
import { X, User, AlertCircle, Tag, ExternalLink } from "lucide-react";
import type { SelectedNode } from "@/types/graph";

const TYPE_ICONS = {
  user: User,
  issue: AlertCircle,
  label: Tag,
};

const TYPE_LABELS = {
  user: "User",
  issue: "Issue",
  label: "Label",
};

interface NodeDetailPanelProps {
  node: SelectedNode;
  onClose: () => void;
}

export function NodeDetailPanel({ node, onClose }: NodeDetailPanelProps) {
  const router = useRouter();

  if (!node) return null;

  const Icon = TYPE_ICONS[node.type];
  const meta = node.meta ?? {};
  const metaEntries = Object.entries(meta).filter(
    ([k]) => !["id", "name", "title"].includes(k) && meta[k] !== undefined
  );

  return (
    <div
      className="rounded-lg border border-zinc-200 bg-white p-4 shadow-lg dark:border-zinc-700 dark:bg-zinc-800"
      data-testid="node-detail-panel"
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon size={18} className="text-zinc-500" />
          <span className="text-xs font-medium uppercase text-zinc-400">
            {TYPE_LABELS[node.type]}
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
              <dt className="min-w-[70px] font-medium capitalize text-zinc-500 dark:text-zinc-400">
                {key}
              </dt>
              <dd className="text-zinc-900 dark:text-zinc-100">{value}</dd>
            </div>
          ))}
        </dl>
      )}

      {node.type === "issue" && (
        <button
          onClick={() => router.push(`/board?issue=${meta.id ?? node.id}`)}
          className="mt-3 flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          <ExternalLink size={14} />
          보드에서 보기
        </button>
      )}
    </div>
  );
}
