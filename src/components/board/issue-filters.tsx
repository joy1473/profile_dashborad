"use client";

import { Search } from "lucide-react";
import type { IssuePriority } from "@/types/issue";

interface IssueFiltersProps {
  search: string;
  onSearchChange: (v: string) => void;
  priorityFilter: IssuePriority | "all";
  onPriorityChange: (v: IssuePriority | "all") => void;
  assigneeFilter: string;
  onAssigneeChange: (v: string) => void;
  assignees: string[];
}

const selectClass =
  "rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50";

export function IssueFilters({
  search,
  onSearchChange,
  priorityFilter,
  onPriorityChange,
  assigneeFilter,
  onAssigneeChange,
  assignees,
}: IssueFiltersProps) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-3" data-testid="issue-filters">
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="이슈 검색..."
          className="rounded-lg border border-zinc-300 bg-white py-2 pl-9 pr-3 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50"
          data-testid="issue-search"
        />
      </div>
      <select
        value={priorityFilter}
        onChange={(e) => onPriorityChange(e.target.value as IssuePriority | "all")}
        className={selectClass}
        data-testid="priority-filter"
      >
        <option value="all">모든 우선순위</option>
        <option value="high">High</option>
        <option value="medium">Medium</option>
        <option value="low">Low</option>
      </select>
      <select
        value={assigneeFilter}
        onChange={(e) => onAssigneeChange(e.target.value)}
        className={selectClass}
        data-testid="assignee-filter"
      >
        <option value="all">모든 담당자</option>
        {assignees.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </select>
    </div>
  );
}
