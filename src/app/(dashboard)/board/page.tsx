"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import { KanbanBoard } from "@/components/board/kanban-board";
import { IssueModal } from "@/components/board/issue-modal";
import { IssueFilters } from "@/components/board/issue-filters";
import { useToast } from "@/components/ui/toast";
import { useRealtimeIssues, getRealtimeToastMessage } from "@/hooks/use-realtime-issues";
import type { RealtimeIssueEvent } from "@/hooks/use-realtime-issues";
import { fetchIssues, createIssue, updateIssue, deleteIssue, moveIssue } from "@/lib/issues";
import { fetchProfiles } from "@/lib/users";
import { fetchSubtaskCounts } from "@/lib/subtasks";
import { fetchLinkCounts } from "@/lib/links";
import { supabase } from "@/lib/supabase";
import { MyTasks } from "@/components/board/my-tasks";
import { BoardSkeleton } from "@/components/skeletons/board-skeleton";
import { cn } from "@/lib/utils";
import type { Issue, IssueStatus, IssuePriority, CreateIssueInput } from "@/types/issue";
import type { User } from "@/types";
import type { SubtaskCount } from "@/types/subtask";

export default function BoardPage() {
  const searchParams = useSearchParams();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();

  // Tab & subtask state
  const [activeTab, setActiveTab] = useState<"board" | "my-tasks">("board");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [subtaskCounts, setSubtaskCounts] = useState<Map<string, SubtaskCount>>(new Map());
  const [linkCounts, setLinkCounts] = useState<Map<string, number>>(new Map());

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingIssue, setEditingIssue] = useState<Issue | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<IssuePriority | "all">("all");
  const [assigneeFilter, setAssigneeFilter] = useState("all");

  // Derive unique assignee names for filter dropdown
  const assignees = useMemo(() => {
    const names = issues
      .map((i) => i.assignee_name)
      .filter((n): n is string => n !== null);
    return [...new Set(names)].sort();
  }, [issues]);

  const loadIssues = useCallback(async () => {
    try {
      const data = await fetchIssues();
      setIssues(data);
      setError(null);
    } catch {
      setError("이슈를 불러올 수 없습니다");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadIssues();
    fetchProfiles().then(setUsers);
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id ?? null);
    });
  }, [loadIssues]);

  // Load subtask counts when issues change
  useEffect(() => {
    const ids = issues.map((i) => i.id);
    fetchSubtaskCounts(ids).then(setSubtaskCounts);
    fetchLinkCounts(ids).then(setLinkCounts);
  }, [issues]);

  // Open issue modal from URL query param (?issue=ID) — e.g. from graph page
  useEffect(() => {
    const issueId = searchParams.get("issue");
    if (issueId && issues.length > 0 && !modalOpen) {
      const found = issues.find((i) => i.id === issueId);
      if (found) {
        setEditingIssue(found);
        setModalOpen(true);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, issues]);

  // Realtime: 다른 클라이언트의 이슈 변경을 자동 반영
  const handleRealtimeEvent = useCallback(
    (event: RealtimeIssueEvent) => {
      switch (event.eventType) {
        case "INSERT":
          if (event.new)
            setIssues((prev) =>
              prev.some((i) => i.id === (event.new as Issue).id)
                ? prev
                : [...prev, event.new as Issue]
            );
          break;
        case "UPDATE":
          if (event.new)
            setIssues((prev) =>
              prev.map((i) =>
                i.id === (event.new as Issue).id ? (event.new as Issue) : i
              )
            );
          break;
        case "DELETE":
          setIssues((prev) => prev.filter((i) => i.id !== event.old.id));
          break;
      }
      showToast(getRealtimeToastMessage(event), "success");
    },
    [showToast]
  );

  useRealtimeIssues(handleRealtimeEvent);

  const handleMove = useCallback(
    async (issueId: string, newStatus: IssueStatus, newPosition: number) => {
      const original = issues.find((i) => i.id === issueId);
      if (!original) return;

      // Optimistic update
      setIssues((prev) =>
        prev.map((i) =>
          i.id === issueId ? { ...i, status: newStatus, position: newPosition } : i
        )
      );

      try {
        await moveIssue(issueId, newStatus, newPosition);
      } catch {
        // Rollback
        setIssues((prev) =>
          prev.map((i) =>
            i.id === issueId ? { ...i, status: original.status, position: original.position } : i
          )
        );
        showToast("이동에 실패했습니다");
      }
    },
    [issues, showToast]
  );

  const handleSave = useCallback(
    async (input: CreateIssueInput) => {
      try {
        if (editingIssue) {
          const updated = await updateIssue(editingIssue.id, input);
          setIssues((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
          showToast("이슈가 수정되었습니다", "success");
        } else {
          const created = await createIssue(input);
          setIssues((prev) => [...prev, created]);
          showToast("이슈가 생성되었습니다", "success");
        }
        setModalOpen(false);
        setEditingIssue(null);
      } catch {
        showToast(editingIssue ? "이슈 수정에 실패했습니다" : "이슈 생성에 실패했습니다");
      }
    },
    [editingIssue, showToast]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await deleteIssue(id);
        setIssues((prev) => prev.filter((i) => i.id !== id));
        setModalOpen(false);
        setEditingIssue(null);
        showToast("이슈가 삭제되었습니다", "success");
      } catch {
        showToast("이슈 삭제에 실패했습니다");
      }
    },
    [showToast]
  );

  const handleCardClick = useCallback((issue: Issue) => {
    setEditingIssue(issue);
    setModalOpen(true);
  }, []);

  const openCreateModal = useCallback(() => {
    setEditingIssue(null);
    setModalOpen(true);
  }, []);

  // Apply filters
  const filteredIssues = issues.filter((issue) => {
    if (priorityFilter !== "all" && issue.priority !== priorityFilter) return false;
    if (assigneeFilter !== "all" && issue.assignee_name !== assigneeFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        issue.title.toLowerCase().includes(q) ||
        issue.labels.some((l) => l.toLowerCase().includes(q)) ||
        (issue.assignee_name?.toLowerCase().includes(q) ?? false)
      );
    }
    return true;
  });

  if (loading) {
    return <BoardSkeleton />;
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50" data-testid="page-title">
            보드
          </h2>
          <div className="flex gap-1 rounded-lg bg-zinc-100 p-1 dark:bg-zinc-800">
            <button
              onClick={() => setActiveTab("board")}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium",
                activeTab === "board"
                  ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-50"
                  : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400"
              )}
            >
              전체 보드
            </button>
            <button
              onClick={() => setActiveTab("my-tasks")}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium",
                activeTab === "my-tasks"
                  ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-50"
                  : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400"
              )}
            >
              내 할일
            </button>
          </div>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          data-testid="create-issue-btn"
        >
          <Plus size={16} />
          새 이슈
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950/30 dark:text-red-400">
          {error}
          <button onClick={loadIssues} className="ml-2 underline">
            재시도
          </button>
        </div>
      )}

      {activeTab === "board" ? (
        <>
          <IssueFilters
            search={search}
            onSearchChange={setSearch}
            priorityFilter={priorityFilter}
            onPriorityChange={setPriorityFilter}
            assigneeFilter={assigneeFilter}
            onAssigneeChange={setAssigneeFilter}
            assignees={assignees}
          />

          <KanbanBoard
            issues={filteredIssues}
            onMove={handleMove}
            onCardClick={handleCardClick}
            subtaskCounts={subtaskCounts}
            linkCounts={linkCounts}
          />
        </>
      ) : (
        currentUserId ? (
          <MyTasks
            userId={currentUserId}
            users={users}
            onIssueClick={(issueId) => {
              const issue = issues.find((i) => i.id === issueId);
              if (issue) handleCardClick(issue);
            }}
          />
        ) : (
          <p className="text-sm text-zinc-500">로그인이 필요합니다</p>
        )
      )}

      <IssueModal
        issue={editingIssue}
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingIssue(null);
        }}
        onSave={handleSave}
        onDelete={handleDelete}
        users={users}
      />
    </div>
  );
}
