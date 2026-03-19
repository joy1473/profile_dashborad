"use client";

import { useState } from "react";
import { Plus, Trash2, Pencil, History } from "lucide-react";
import type { User } from "@/types";
import type { Subtask, SubtaskActivity } from "@/types/subtask";
import {
  createSubtask,
  toggleSubtask,
  deleteSubtask,
  updateSubtaskTitle,
  updateSubtaskAssignee,
} from "@/lib/subtasks";

interface SubtaskSectionProps {
  issueId: string;
  subtasks: Subtask[];
  activities: SubtaskActivity[];
  users: User[];
  onSubtasksChange: (subtasks: Subtask[]) => void;
  onRefreshActivities: () => void;
}

export function SubtaskSection({ issueId, subtasks, activities, users, onSubtasksChange, onRefreshActivities }: SubtaskSectionProps) {
  const [newTitle, setNewTitle] = useState("");
  const [newAssignee, setNewAssignee] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [showActivities, setShowActivities] = useState(false);

  async function handleAdd() {
    if (!newTitle.trim()) return;
    const selectedUser = users.find((u) => u.id === newAssignee);
    const subtask = await createSubtask(issueId, newTitle.trim(), newAssignee || null, selectedUser?.name || null);
    onSubtasksChange([...subtasks, subtask]);
    setNewTitle("");
    setNewAssignee("");
    onRefreshActivities();
  }

  async function handleToggle(st: Subtask) {
    const updated = await toggleSubtask(st.id, !st.is_done, issueId);
    onSubtasksChange(subtasks.map((s) => (s.id === updated.id ? updated : s)));
    onRefreshActivities();
  }

  async function handleDelete(id: string) {
    const st = subtasks.find((s) => s.id === id);
    await deleteSubtask(id, issueId, st?.title);
    onSubtasksChange(subtasks.filter((s) => s.id !== id));
    onRefreshActivities();
  }

  function startEdit(st: Subtask) {
    setEditingId(st.id);
    setEditingTitle(st.title);
  }

  async function saveEdit(st: Subtask) {
    if (!editingTitle.trim() || editingTitle.trim() === st.title) {
      setEditingId(null);
      return;
    }
    const updated = await updateSubtaskTitle(st.id, issueId, st.title, editingTitle.trim());
    onSubtasksChange(subtasks.map((s) => (s.id === updated.id ? updated : s)));
    setEditingId(null);
    onRefreshActivities();
  }

  async function handleAssigneeChange(st: Subtask, newAssigneeId: string) {
    const selectedUser = users.find((u) => u.id === newAssigneeId);
    const updated = await updateSubtaskAssignee(st.id, issueId, st.assignee_name, newAssigneeId || null, selectedUser?.name || null);
    onSubtasksChange(subtasks.map((s) => (s.id === updated.id ? updated : s)));
    onRefreshActivities();
  }

  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
        서브태스크{" "}
        {subtasks.length > 0 && (
          <span className="text-xs font-normal text-zinc-400">({subtasks.filter((s) => s.is_done).length}/{subtasks.length})</span>
        )}
      </label>

      <div className="mb-2 flex gap-1.5">
        <input type="text" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAdd(); } }} placeholder="서브태스크 제목" className="flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50" />
        <select value={newAssignee} onChange={(e) => setNewAssignee(e.target.value)} className="w-28 rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50">
          <option value="">담당자</option>
          {users.map((u) => (<option key={u.id} value={u.id}>{u.name}</option>))}
        </select>
        <button type="button" onClick={handleAdd} disabled={!newTitle.trim()} className="flex items-center rounded-lg bg-blue-600 px-2.5 py-1.5 text-sm text-white hover:bg-blue-700 disabled:opacity-50">
          <Plus size={14} />
        </button>
      </div>

      {subtasks.length > 0 && (
        <div className="space-y-1">
          {subtasks.map((st) => (
            <div key={st.id} className="flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-1.5 text-sm dark:border-zinc-700">
              <input type="checkbox" checked={st.is_done} onChange={() => handleToggle(st)} className="h-3.5 w-3.5 rounded border-zinc-300 text-blue-600 focus:ring-blue-500" />
              {editingId === st.id ? (
                <input type="text" value={editingTitle} onChange={(e) => setEditingTitle(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); saveEdit(st); } if (e.key === "Escape") setEditingId(null); }} onBlur={() => saveEdit(st)} autoFocus className="flex-1 rounded border border-blue-400 bg-white px-1.5 py-0.5 text-sm text-zinc-900 focus:outline-none dark:bg-zinc-800 dark:text-zinc-50" />
              ) : (
                <span className={`flex-1 truncate cursor-pointer ${st.is_done ? "text-zinc-400 line-through" : "text-zinc-900 dark:text-zinc-100"}`} onDoubleClick={() => startEdit(st)} title="더블클릭으로 수정">{st.title}</span>
              )}
              <select value={st.assignee_id ?? ""} onChange={(e) => handleAssigneeChange(st, e.target.value)} className="w-20 shrink-0 rounded border border-zinc-200 bg-transparent px-1 py-0.5 text-xs text-zinc-500 focus:border-blue-400 focus:outline-none dark:border-zinc-700 dark:text-zinc-400">
                <option value="">미배정</option>
                {users.map((u) => (<option key={u.id} value={u.id}>{u.name}</option>))}
              </select>
              {editingId !== st.id && (
                <button type="button" onClick={() => startEdit(st)} className="shrink-0 rounded p-0.5 text-zinc-400 hover:bg-zinc-100 hover:text-blue-600 dark:hover:bg-zinc-800 dark:hover:text-blue-400" aria-label="수정">
                  <Pencil size={12} />
                </button>
              )}
              <button type="button" onClick={() => handleDelete(st.id)} className="shrink-0 rounded p-0.5 text-zinc-400 hover:bg-zinc-100 hover:text-red-600 dark:hover:bg-zinc-800 dark:hover:text-red-400" aria-label="삭제">
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {subtasks.length === 0 && <p className="text-xs text-zinc-400">서브태스크가 없습니다</p>}

      {activities.length > 0 && (
        <div className="mt-2">
          <button type="button" onClick={() => setShowActivities(!showActivities)} className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300">
            <History size={12} />
            이력 ({activities.length})
            <span className="text-[10px]">{showActivities ? "▲" : "▼"}</span>
          </button>
          {showActivities && (
            <div className="mt-1.5 max-h-40 overflow-y-auto rounded-lg border border-zinc-200 bg-zinc-50 p-2 dark:border-zinc-700 dark:bg-zinc-800/50">
              {activities.map((act) => (
                <div key={act.id} className="flex items-start gap-2 py-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                  <span className="shrink-0 text-zinc-400">
                    {new Date(act.created_at).toLocaleDateString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <span>
                    <span className="font-medium text-zinc-700 dark:text-zinc-300">{act.actor_name ?? "시스템"}</span>{" "}
                    {act.action === "created" && <>서브태스크 <span className="font-medium">&quot;{act.new_value}&quot;</span> 생성</>}
                    {act.action === "title_changed" && <>제목 변경: <span className="line-through">{act.old_value}</span> → <span className="font-medium">{act.new_value}</span></>}
                    {act.action === "assignee_changed" && <>담당자 변경: {act.old_value} → <span className="font-medium">{act.new_value}</span></>}
                    {act.action === "completed" && <>서브태스크 완료 처리</>}
                    {act.action === "reopened" && <>서브태스크 다시 열기</>}
                    {act.action === "deleted" && <>서브태스크 <span className="font-medium">&quot;{act.old_value}&quot;</span> 삭제</>}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
