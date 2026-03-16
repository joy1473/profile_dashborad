"use client";

import { Draggable } from "@hello-pangea/dnd";
import { Calendar, User, CheckSquare, Link2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Issue } from "@/types/issue";

const priorityStyles = {
  high: "border-l-red-500",
  medium: "border-l-yellow-500",
  low: "border-l-green-500",
};

interface IssueCardProps {
  issue: Issue;
  index: number;
  onClick: () => void;
  subtaskCount?: { total: number; done: number };
  linkCount?: number;
}

export function IssueCard({ issue, index, onClick, subtaskCount, linkCount }: IssueCardProps) {
  return (
    <Draggable draggableId={issue.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={onClick}
          className={cn(
            "cursor-pointer rounded-lg border border-l-4 border-zinc-200 bg-white p-3 shadow-sm transition-shadow hover:shadow-md dark:border-zinc-700 dark:bg-zinc-900",
            priorityStyles[issue.priority],
            snapshot.isDragging && "shadow-lg ring-2 ring-blue-500/30"
          )}
          data-testid={`issue-card-${issue.id}`}
        >
          {issue.labels.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1">
              {issue.labels.map((label) => (
                <span
                  key={label}
                  className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                >
                  {label}
                </span>
              ))}
            </div>
          )}

          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
            {issue.title}
          </p>

          <div className="mt-2 flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
            {issue.assignee_name && (
              <span className="flex items-center gap-1">
                <User size={12} />
                {issue.assignee_name}
              </span>
            )}
            {issue.due_date && (
              <span className="flex items-center gap-1">
                <Calendar size={12} />
                {issue.due_date}
              </span>
            )}
            {subtaskCount && subtaskCount.total > 0 && (
              <span className="flex items-center gap-1">
                <CheckSquare size={12} />
                {subtaskCount.done}/{subtaskCount.total}
              </span>
            )}
            {linkCount != null && linkCount > 0 && (
              <span className="flex items-center gap-1">
                <Link2 size={12} />
                {linkCount}
              </span>
            )}
          </div>
        </div>
      )}
    </Draggable>
  );
}
