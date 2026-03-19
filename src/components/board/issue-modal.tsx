"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import type { Issue, IssueStatus, IssuePriority, CreateIssueInput } from "@/types/issue";
import type { User } from "@/types";
import type { Attachment } from "@/types/attachment";
import type { Subtask, SubtaskActivity } from "@/types/subtask";
import type { IssueLink } from "@/types/link";
import { fetchAttachments } from "@/lib/attachments";
import { fetchSubtasks, fetchSubtaskActivities } from "@/lib/subtasks";
import { fetchLinks } from "@/lib/links";
import { AttachmentSection } from "./attachment-section";
import { LinkSection } from "./link-section";
import { SubtaskSection } from "./subtask-section";

interface IssueModalProps {
  issue: Issue | null;
  open: boolean;
  onClose: () => void;
  onSave: (input: CreateIssueInput) => void;
  onDelete?: (id: string) => void;
  users?: User[];
}

const statusOptions: { value: IssueStatus; label: string }[] = [
  { value: "todo", label: "To Do" },
  { value: "in_progress", label: "In Progress" },
  { value: "in_review", label: "In Review" },
  { value: "done", label: "Done" },
];

const priorityOptions: { value: IssuePriority; label: string }[] = [
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

export function IssueModal(props: IssueModalProps) {
  if (!props.open) return null;
  const formKey = props.issue?.id ?? "new";
  return <IssueModalForm key={formKey} {...props} users={props.users} />;
}

function IssueModalForm({ issue, onClose, onSave, onDelete, users = [] }: IssueModalProps) {
  const [title, setTitle] = useState(issue?.title ?? "");
  const [description, setDescription] = useState(issue?.description ?? "");
  const [status, setStatus] = useState<IssueStatus>(issue?.status ?? "todo");
  const [priority, setPriority] = useState<IssuePriority>(issue?.priority ?? "medium");
  const [assigneeId, setAssigneeId] = useState(issue?.assignee_id ?? "");
  const [dueDate, setDueDate] = useState(issue?.due_date ?? "");
  const [labelsText, setLabelsText] = useState(issue?.labels.join(", ") ?? "");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [activities, setActivities] = useState<SubtaskActivity[]>([]);
  const [links, setLinks] = useState<IssueLink[]>([]);

  useEffect(() => {
    if (issue?.id) {
      fetchAttachments(issue.id).then(setAttachments);
      fetchSubtasks(issue.id).then(setSubtasks);
      fetchSubtaskActivities(issue.id).then(setActivities);
      fetchLinks(issue.id).then(setLinks);
    }
  }, [issue?.id]);

  function refreshActivities() {
    if (issue?.id) fetchSubtaskActivities(issue.id).then(setActivities);
  }

  const isEdit = !!issue;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    const labels = labelsText.split(",").map((l) => l.trim()).filter(Boolean);
    const selectedUser = users.find((u) => u.id === assigneeId);
    onSave({
      title: title.trim(),
      description: description.trim(),
      status,
      priority,
      assignee_id: assigneeId || null,
      assignee_name: selectedUser?.name || null,
      labels,
      due_date: dueDate || null,
    });
  }

  const inputClass =
    "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose} role="dialog" aria-modal="true" aria-label={isEdit ? "이슈 수정" : "새 이슈 생성"}>
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
        data-testid="issue-modal"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
            {isEdit ? "이슈 수정" : "새 이슈 생성"}
          </h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200" aria-label="닫기">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">제목 *</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required className={inputClass} data-testid="issue-title-input" />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">설명</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className={inputClass} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">우선순위</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value as IssuePriority)} className={inputClass}>
                {priorityOptions.map((p) => (<option key={p.value} value={p.value}>{p.label}</option>))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">상태</label>
              <select value={status} onChange={(e) => setStatus(e.target.value as IssueStatus)} className={inputClass}>
                {statusOptions.map((s) => (<option key={s.value} value={s.value}>{s.label}</option>))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">담당자</label>
              <select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)} className={inputClass}>
                <option value="">미배정</option>
                {users.map((u) => (<option key={u.id} value={u.id}>{u.name}</option>))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">마감일</label>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputClass} />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">라벨 (쉼표로 구분)</label>
            <input type="text" value={labelsText} onChange={(e) => setLabelsText(e.target.value)} placeholder="bug, frontend, urgent" className={inputClass} />
          </div>

          {isEdit && <AttachmentSection issueId={issue!.id} attachments={attachments} onAttachmentsChange={setAttachments} />}
          {isEdit && <LinkSection issueId={issue!.id} links={links} onLinksChange={setLinks} />}
          {isEdit && <SubtaskSection issueId={issue!.id} subtasks={subtasks} activities={activities} users={users} onSubtasksChange={setSubtasks} onRefreshActivities={refreshActivities} />}

          <div className="flex items-center justify-between pt-2">
            <div>
              {isEdit && onDelete && (
                showDeleteConfirm ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-red-600">정말 삭제?</span>
                    <button type="button" onClick={() => onDelete(issue!.id)} className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700">삭제</button>
                    <button type="button" onClick={() => setShowDeleteConfirm(false)} className="text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300">취소</button>
                  </div>
                ) : (
                  <button type="button" onClick={() => setShowDeleteConfirm(true)} className="text-sm text-red-500 hover:text-red-700">삭제</button>
                )
              )}
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800">취소</button>
              <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700" data-testid="issue-save-btn">저장</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
