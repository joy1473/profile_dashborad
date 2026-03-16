"use client";

import { Droppable } from "@hello-pangea/dnd";
import { cn } from "@/lib/utils";
import { IssueCard } from "./issue-card";
import type { Issue, IssueStatus } from "@/types/issue";
import type { SubtaskCount } from "@/types/subtask";

const columnTitles: Record<IssueStatus, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  in_review: "In Review",
  done: "Done",
};

interface KanbanColumnProps {
  status: IssueStatus;
  issues: Issue[];
  onCardClick: (issue: Issue) => void;
  subtaskCounts?: Map<string, SubtaskCount>;
  linkCounts?: Map<string, number>;
}

export function KanbanColumn({ status, issues, onCardClick, subtaskCounts, linkCounts }: KanbanColumnProps) {
  return (
    <div className="flex w-72 shrink-0 flex-col lg:w-auto lg:flex-1" data-testid={`column-${status}`}>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          {columnTitles[status]}
        </h3>
        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
          {issues.length}
        </span>
      </div>

      <Droppable droppableId={status}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn(
              "flex flex-1 flex-col gap-2 rounded-lg bg-zinc-50 p-2 transition-colors dark:bg-zinc-900/50",
              snapshot.isDraggingOver && "bg-blue-50 dark:bg-blue-950/20"
            )}
            style={{ minHeight: 120 }}
          >
            {issues.map((issue, index) => (
              <IssueCard
                key={issue.id}
                issue={issue}
                index={index}
                onClick={() => onCardClick(issue)}
                subtaskCount={subtaskCounts?.get(issue.id)}
                linkCount={linkCounts?.get(issue.id)}
              />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}
