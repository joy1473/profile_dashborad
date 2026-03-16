"use client";

import { useState, useEffect } from "react";
import { CheckSquare, Loader2, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchMySubtasks, toggleSubtask, updateSubtaskTitle, updateSubtaskAssignee } from "@/lib/subtasks";
import type { MySubtask } from "@/types/subtask";
import type { User } from "@/types";

const statusBadge: Record<string, { label: string; className: string }> = {
  todo: { label: "To Do", className: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400" },
  in_progress: { label: "In Progress", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  in_review: { label: "In Review", className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" },
  done: { label: "Done", className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
};

interface MyTasksProps {
  userId: string;
  users: User[];
  onIssueClick: (issueId: string) => void;
}

export function MyTasks({ userId, users, onIssueClick }: MyTasksProps) {
  const [tasks, setTasks] = useState<MySubtask[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");

  useEffect(() => {
    fetchMySubtasks(userId).then((data) => {
      setTasks(data);
      setLoading(false);
    });
  }, [userId]);

  async function handleToggle(task: MySubtask) {
    const updated = await toggleSubtask(task.id, !task.is_done, task.issue_id);
    setTasks((prev) =>
      prev.map((t) => (t.id === updated.id ? { ...t, is_done: updated.is_done } : t))
    );
  }

  function startEdit(task: MySubtask) {
    setEditingId(task.id);
    setEditingTitle(task.title);
  }

  async function saveEdit(task: MySubtask) {
    if (!editingTitle.trim() || editingTitle.trim() === task.title) {
      setEditingId(null);
      return;
    }
    const updated = await updateSubtaskTitle(task.id, task.issue_id, task.title, editingTitle.trim());
    setTasks((prev) => prev.map((t) => (t.id === updated.id ? { ...t, title: updated.title } : t)));
    setEditingId(null);
  }

  async function handleAssigneeChange(task: MySubtask, newAssigneeId: string) {
    const selectedUser = users.find((u) => u.id === newAssigneeId);
    const updated = await updateSubtaskAssignee(
      task.id,
      task.issue_id,
      task.assignee_name,
      newAssigneeId || null,
      selectedUser?.name || null,
    );
    setTasks((prev) =>
      prev.map((t) => (t.id === updated.id ? { ...t, assignee_id: updated.assignee_id, assignee_name: updated.assignee_name } : t))
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-zinc-400">
        <Loader2 size={20} className="animate-spin" />
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-white p-8 text-center dark:border-zinc-700 dark:bg-zinc-900">
        <CheckSquare size={32} className="mx-auto mb-2 text-zinc-300 dark:text-zinc-600" />
        <p className="text-sm text-zinc-500 dark:text-zinc-400">배정된 할일이 없습니다</p>
      </div>
    );
  }

  const incomplete = tasks.filter((t) => !t.is_done);
  const complete = tasks.filter((t) => t.is_done);

  return (
    <div className="space-y-2">
      <p className="mb-3 text-sm text-zinc-500 dark:text-zinc-400">
        내 할일 ({incomplete.length}개 남음 / 총 {tasks.length}개)
      </p>

      {[...incomplete, ...complete].map((task) => {
        const badge = statusBadge[task.issue_status] ?? statusBadge.todo;
        return (
          <div
            key={task.id}
            className={cn(
              "rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900",
              task.is_done && "opacity-60"
            )}
          >
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={task.is_done}
                onChange={() => handleToggle(task)}
                className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  {editingId === task.id ? (
                    <input
                      type="text"
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); saveEdit(task); } if (e.key === "Escape") setEditingId(null); }}
                      onBlur={() => saveEdit(task)}
                      autoFocus
                      className="flex-1 rounded border border-blue-400 bg-white px-2 py-0.5 text-sm text-zinc-900 focus:outline-none dark:bg-zinc-800 dark:text-zinc-50"
                    />
                  ) : (
                    <>
                      <p
                        className={cn(
                          "flex-1 text-sm font-medium text-zinc-900 dark:text-zinc-50",
                          task.is_done && "line-through"
                        )}
                        onDoubleClick={() => startEdit(task)}
                        title="더블클릭으로 수정"
                      >
                        {task.title}
                      </p>
                      <button
                        type="button"
                        onClick={() => startEdit(task)}
                        className="shrink-0 rounded p-0.5 text-zinc-400 hover:bg-zinc-100 hover:text-blue-600 dark:hover:bg-zinc-800 dark:hover:text-blue-400"
                        title="수정"
                      >
                        <Pencil size={12} />
                      </button>
                    </>
                  )}
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onIssueClick(task.issue_id)}
                    className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-blue-600 dark:text-zinc-400 dark:hover:text-blue-400"
                  >
                    <span>📋</span>
                    <span className="truncate">{task.issue_title}</span>
                    <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-medium", badge.className)}>
                      {badge.label}
                    </span>
                  </button>
                  <select
                    value={task.assignee_id ?? ""}
                    onChange={(e) => handleAssigneeChange(task, e.target.value)}
                    className="ml-auto w-20 shrink-0 rounded border border-zinc-200 bg-transparent px-1 py-0.5 text-xs text-zinc-500 focus:border-blue-400 focus:outline-none dark:border-zinc-700 dark:text-zinc-400"
                  >
                    <option value="">미배정</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
