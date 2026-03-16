"use client";

import { useState, useEffect, useRef } from "react";
import { X, Paperclip, Download, Trash2, Loader2, Plus, CheckSquare, Pencil, Check, History, Link2, ExternalLink } from "lucide-react";
import type { Issue, IssueStatus, IssuePriority, CreateIssueInput } from "@/types/issue";
import type { User } from "@/types";
import type { Attachment } from "@/types/attachment";
import type { Subtask, SubtaskActivity } from "@/types/subtask";
import type { IssueLink } from "@/types/link";
import {
  fetchAttachments,
  uploadAttachment,
  deleteAttachment,
  getSignedDownloadUrl,
  formatFileSize,
} from "@/lib/attachments";
import {
  fetchSubtasks,
  createSubtask,
  toggleSubtask,
  deleteSubtask,
  updateSubtaskTitle,
  updateSubtaskAssignee,
  fetchSubtaskActivities,
} from "@/lib/subtasks";
import { fetchLinks, createLink, deleteLink, extractDomain } from "@/lib/links";

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

  // key forces remount when switching between issues or create/edit
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

  // Attachments
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Subtasks
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [newSubtaskAssignee, setNewSubtaskAssignee] = useState("");
  const [editingSubtaskId, setEditingSubtaskId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");

  // Activities
  const [activities, setActivities] = useState<SubtaskActivity[]>([]);
  const [showActivities, setShowActivities] = useState(false);

  // Links
  const [links, setLinks] = useState<IssueLink[]>([]);
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [newLinkLabel, setNewLinkLabel] = useState("");

  useEffect(() => {
    if (issue?.id) {
      fetchAttachments(issue.id).then(setAttachments);
      fetchSubtasks(issue.id).then(setSubtasks);
      fetchSubtaskActivities(issue.id).then(setActivities);
      fetchLinks(issue.id).then(setLinks);
    }
  }, [issue?.id]);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files?.length || !issue?.id) return;

    setUploading(true);
    setUploadError(null);
    try {
      for (const file of Array.from(files)) {
        const attachment = await uploadAttachment(issue.id, file);
        setAttachments((prev) => [attachment, ...prev]);
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "업로드에 실패했습니다");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleDownload(att: Attachment) {
    const url = await getSignedDownloadUrl(att.file_path);
    if (url) {
      window.open(url, "_blank");
    }
  }

  async function handleDeleteAttachment(attachment: Attachment) {
    await deleteAttachment(attachment);
    setAttachments((prev) => prev.filter((a) => a.id !== attachment.id));
  }

  async function handleAddSubtask() {
    if (!newSubtaskTitle.trim() || !issue?.id) return;
    const selectedUser = users.find((u) => u.id === newSubtaskAssignee);
    const subtask = await createSubtask(
      issue.id,
      newSubtaskTitle.trim(),
      newSubtaskAssignee || null,
      selectedUser?.name || null,
    );
    setSubtasks((prev) => [...prev, subtask]);
    setNewSubtaskTitle("");
    setNewSubtaskAssignee("");
    refreshActivities();
  }

  async function handleToggleSubtask(subtask: Subtask) {
    const updated = await toggleSubtask(subtask.id, !subtask.is_done, issue?.id);
    setSubtasks((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    refreshActivities();
  }

  async function handleDeleteSubtask(id: string) {
    const st = subtasks.find((s) => s.id === id);
    await deleteSubtask(id, issue?.id, st?.title);
    setSubtasks((prev) => prev.filter((s) => s.id !== id));
    refreshActivities();
  }

  function startEditTitle(st: Subtask) {
    setEditingSubtaskId(st.id);
    setEditingTitle(st.title);
  }

  async function saveEditTitle(st: Subtask) {
    if (!editingTitle.trim() || editingTitle.trim() === st.title || !issue?.id) {
      setEditingSubtaskId(null);
      return;
    }
    const updated = await updateSubtaskTitle(st.id, issue.id, st.title, editingTitle.trim());
    setSubtasks((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    setEditingSubtaskId(null);
    refreshActivities();
  }

  async function handleAssigneeChange(st: Subtask, newAssigneeId: string) {
    if (!issue?.id) return;
    const selectedUser = users.find((u) => u.id === newAssigneeId);
    const updated = await updateSubtaskAssignee(
      st.id,
      issue.id,
      st.assignee_name,
      newAssigneeId || null,
      selectedUser?.name || null,
    );
    setSubtasks((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    refreshActivities();
  }

  function refreshActivities() {
    if (issue?.id) fetchSubtaskActivities(issue.id).then(setActivities);
  }

  async function handleAddLink() {
    if (!newLinkUrl.trim() || !issue?.id) return;
    let url = newLinkUrl.trim();
    if (!/^https?:\/\//i.test(url)) url = "https://" + url;
    const link = await createLink(issue.id, url, newLinkLabel);
    setLinks((prev) => [link, ...prev]);
    setNewLinkUrl("");
    setNewLinkLabel("");
  }

  async function handleDeleteLink(id: string) {
    await deleteLink(id);
    setLinks((prev) => prev.filter((l) => l.id !== id));
  }

  const isEdit = !!issue;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    const labels = labelsText
      .split(",")
      .map((l) => l.trim())
      .filter(Boolean);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
        data-testid="issue-modal"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
            {isEdit ? "이슈 수정" : "새 이슈 생성"}
          </h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              제목 *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className={inputClass}
              data-testid="issue-title-input"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              설명
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                우선순위
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as IssuePriority)}
                className={inputClass}
              >
                {priorityOptions.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                상태
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as IssueStatus)}
                className={inputClass}
              >
                {statusOptions.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                담당자
              </label>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className={inputClass}
              >
                <option value="">미배정</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                마감일
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              라벨 (쉼표로 구분)
            </label>
            <input
              type="text"
              value={labelsText}
              onChange={(e) => setLabelsText(e.target.value)}
              placeholder="bug, frontend, urgent"
              className={inputClass}
            />
          </div>

          {/* 첨부파일 — 이슈 수정 모드에서만 표시 */}
          {isEdit && (
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                첨부파일
              </label>

              {/* Upload button */}
              <div className="mb-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="flex items-center gap-1.5 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  {uploading ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Paperclip size={14} />
                  )}
                  {uploading ? "업로드 중..." : "파일 첨부"}
                </button>
              </div>

              {uploadError && (
                <p className="mb-2 text-xs text-red-500">{uploadError}</p>
              )}

              {/* Attachment list */}
              {attachments.length > 0 && (
                <div className="space-y-1.5">
                  {attachments.map((att) => (
                    <div
                      key={att.id}
                      className="flex items-center justify-between rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-zinc-900 dark:text-zinc-100">
                          {att.file_name}
                        </p>
                        <p className="text-xs text-zinc-400">
                          {formatFileSize(att.file_size)}
                        </p>
                      </div>
                      <div className="ml-2 flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleDownload(att)}
                          className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-blue-600 dark:hover:bg-zinc-800 dark:hover:text-blue-400"
                          title="다운로드"
                        >
                          <Download size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteAttachment(att)}
                          className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-red-600 dark:hover:bg-zinc-800 dark:hover:text-red-400"
                          title="삭제"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {attachments.length === 0 && !uploading && (
                <p className="text-xs text-zinc-400">첨부된 파일이 없습니다</p>
              )}
            </div>
          )}

          {/* 링크 — 이슈 수정 모드에서만 표시 */}
          {isEdit && (
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                링크
              </label>

              {/* Add link */}
              <div className="mb-2 flex gap-1.5">
                <input
                  type="text"
                  value={newLinkUrl}
                  onChange={(e) => setNewLinkUrl(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddLink(); } }}
                  placeholder="https://example.com"
                  className="flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50"
                />
                <input
                  type="text"
                  value={newLinkLabel}
                  onChange={(e) => setNewLinkLabel(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddLink(); } }}
                  placeholder="표시명 (선택)"
                  className="w-28 rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50"
                />
                <button
                  type="button"
                  onClick={handleAddLink}
                  disabled={!newLinkUrl.trim()}
                  className="flex items-center rounded-lg bg-blue-600 px-2.5 py-1.5 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  <Plus size={14} />
                </button>
              </div>

              {/* Link list */}
              {links.length > 0 && (
                <div className="space-y-1">
                  {links.map((link) => (
                    <div
                      key={link.id}
                      className="flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-1.5 text-sm dark:border-zinc-700"
                    >
                      <Link2 size={14} className="shrink-0 text-zinc-400" />
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex min-w-0 flex-1 items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        <span className="truncate">{link.label || extractDomain(link.url)}</span>
                        <ExternalLink size={12} className="shrink-0" />
                      </a>
                      {!link.label && (
                        <span className="hidden shrink-0 text-xs text-zinc-400 sm:block">{extractDomain(link.url)}</span>
                      )}
                      {link.label && (
                        <span className="shrink-0 truncate text-xs text-zinc-400 max-w-[120px]">{extractDomain(link.url)}</span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDeleteLink(link.id)}
                        className="shrink-0 rounded p-0.5 text-zinc-400 hover:bg-zinc-100 hover:text-red-600 dark:hover:bg-zinc-800 dark:hover:text-red-400"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {links.length === 0 && (
                <p className="text-xs text-zinc-400">등록된 링크가 없습니다</p>
              )}
            </div>
          )}

          {/* 서브태스크 — 이슈 수정 모드에서만 표시 */}
          {isEdit && (
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                서브태스크{" "}
                {subtasks.length > 0 && (
                  <span className="text-xs font-normal text-zinc-400">
                    ({subtasks.filter((s) => s.is_done).length}/{subtasks.length})
                  </span>
                )}
              </label>

              {/* Add subtask */}
              <div className="mb-2 flex gap-1.5">
                <input
                  type="text"
                  value={newSubtaskTitle}
                  onChange={(e) => setNewSubtaskTitle(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddSubtask(); } }}
                  placeholder="서브태스크 제목"
                  className="flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50"
                />
                <select
                  value={newSubtaskAssignee}
                  onChange={(e) => setNewSubtaskAssignee(e.target.value)}
                  className="w-28 rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50"
                >
                  <option value="">담당자</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleAddSubtask}
                  disabled={!newSubtaskTitle.trim()}
                  className="flex items-center rounded-lg bg-blue-600 px-2.5 py-1.5 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  <Plus size={14} />
                </button>
              </div>

              {/* Subtask list */}
              {subtasks.length > 0 && (
                <div className="space-y-1">
                  {subtasks.map((st) => (
                    <div
                      key={st.id}
                      className="flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-1.5 text-sm dark:border-zinc-700"
                    >
                      <input
                        type="checkbox"
                        checked={st.is_done}
                        onChange={() => handleToggleSubtask(st)}
                        className="h-3.5 w-3.5 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                      />
                      {editingSubtaskId === st.id ? (
                        <input
                          type="text"
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); saveEditTitle(st); } if (e.key === "Escape") setEditingSubtaskId(null); }}
                          onBlur={() => saveEditTitle(st)}
                          autoFocus
                          className="flex-1 rounded border border-blue-400 bg-white px-1.5 py-0.5 text-sm text-zinc-900 focus:outline-none dark:bg-zinc-800 dark:text-zinc-50"
                        />
                      ) : (
                        <span
                          className={`flex-1 truncate cursor-pointer ${st.is_done ? "text-zinc-400 line-through" : "text-zinc-900 dark:text-zinc-100"}`}
                          onDoubleClick={() => startEditTitle(st)}
                          title="더블클릭으로 수정"
                        >
                          {st.title}
                        </span>
                      )}
                      <select
                        value={st.assignee_id ?? ""}
                        onChange={(e) => handleAssigneeChange(st, e.target.value)}
                        className="w-20 shrink-0 rounded border border-zinc-200 bg-transparent px-1 py-0.5 text-xs text-zinc-500 focus:border-blue-400 focus:outline-none dark:border-zinc-700 dark:text-zinc-400"
                      >
                        <option value="">미배정</option>
                        {users.map((u) => (
                          <option key={u.id} value={u.id}>{u.name}</option>
                        ))}
                      </select>
                      {editingSubtaskId !== st.id && (
                        <button
                          type="button"
                          onClick={() => startEditTitle(st)}
                          className="shrink-0 rounded p-0.5 text-zinc-400 hover:bg-zinc-100 hover:text-blue-600 dark:hover:bg-zinc-800 dark:hover:text-blue-400"
                          title="수정"
                        >
                          <Pencil size={12} />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDeleteSubtask(st.id)}
                        className="shrink-0 rounded p-0.5 text-zinc-400 hover:bg-zinc-100 hover:text-red-600 dark:hover:bg-zinc-800 dark:hover:text-red-400"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {subtasks.length === 0 && (
                <p className="text-xs text-zinc-400">서브태스크가 없습니다</p>
              )}

              {/* Activity log */}
              {activities.length > 0 && (
                <div className="mt-2">
                  <button
                    type="button"
                    onClick={() => setShowActivities(!showActivities)}
                    className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                  >
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
                            <span className="font-medium text-zinc-700 dark:text-zinc-300">{act.actor_name ?? "시스템"}</span>
                            {" "}
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
          )}

          <div className="flex items-center justify-between pt-2">
            <div>
              {isEdit && onDelete && (
                showDeleteConfirm ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-red-600">정말 삭제?</span>
                    <button
                      type="button"
                      onClick={() => onDelete(issue!.id)}
                      className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
                    >
                      삭제
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(false)}
                      className="text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                    >
                      취소
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="text-sm text-red-500 hover:text-red-700"
                  >
                    삭제
                  </button>
                )
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                취소
              </button>
              <button
                type="submit"
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                data-testid="issue-save-btn"
              >
                저장
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
