"use client";

import { useCallback } from "react";
import { DragDropContext, type DropResult } from "@hello-pangea/dnd";
import { KanbanColumn } from "./kanban-column";
import type { Issue, IssueStatus } from "@/types/issue";
import type { SubtaskCount } from "@/types/subtask";

const COLUMNS: IssueStatus[] = ["todo", "in_progress", "in_review", "done"];

interface KanbanBoardProps {
  issues: Issue[];
  onMove: (issueId: string, newStatus: IssueStatus, newPosition: number) => void;
  onCardClick: (issue: Issue) => void;
  subtaskCounts?: Map<string, SubtaskCount>;
  linkCounts?: Map<string, number>;
}

export function KanbanBoard({ issues, onMove, onCardClick, subtaskCounts, linkCounts }: KanbanBoardProps) {
  const columnMap = COLUMNS.reduce(
    (acc, status) => {
      acc[status] = issues
        .filter((i) => i.status === status)
        .sort((a, b) => a.position - b.position);
      return acc;
    },
    {} as Record<IssueStatus, Issue[]>
  );

  const handleDragEnd = useCallback(
    (result: DropResult) => {
      const { draggableId, destination, source } = result;
      if (!destination) return;
      if (destination.droppableId === source.droppableId && destination.index === source.index) return;

      const newStatus = destination.droppableId as IssueStatus;
      onMove(draggableId, newStatus, destination.index);
    },
    [onMove]
  );

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4 lg:grid lg:grid-cols-4 lg:overflow-visible" data-testid="kanban-board">
        {COLUMNS.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            issues={columnMap[status]}
            onCardClick={onCardClick}
            subtaskCounts={subtaskCounts}
            linkCounts={linkCounts}
          />
        ))}
      </div>
    </DragDropContext>
  );
}
