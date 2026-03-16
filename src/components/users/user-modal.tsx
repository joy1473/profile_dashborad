"use client";

import { useState, useEffect } from "react";
import { X, Pencil, Check, Shield, ShieldAlert, Eye } from "lucide-react";
import { UserAvatar } from "./user-avatar";
import { cn } from "@/lib/utils";
import type { User, UpdateProfileInput } from "@/types";

interface UserModalProps {
  user: User | null;
  open: boolean;
  onClose: () => void;
  onUpdate: (userId: string, input: UpdateProfileInput) => Promise<void>;
  currentUserId: string | null;
  isAdmin: boolean;
}

const roleOptions: { value: User["role"]; label: string; icon: typeof Shield }[] = [
  { value: "admin", label: "Admin", icon: ShieldAlert },
  { value: "user", label: "User", icon: Shield },
  { value: "viewer", label: "Viewer", icon: Eye },
];

const statusOptions: { value: User["status"]; label: string }[] = [
  { value: "active", label: "활성" },
  { value: "inactive", label: "비활성" },
];

export function UserModal({ user, open, onClose, onUpdate, currentUserId, isAdmin }: UserModalProps) {
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) setNameValue(user.name);
    setEditingName(false);
  }, [user]);

  if (!open || !user) return null;

  const isSelf = currentUserId === user.id;
  const canEditName = isSelf || isAdmin;
  const canEditRole = isAdmin;
  const canEditStatus = isAdmin;

  const handleNameSave = async () => {
    if (!nameValue.trim() || nameValue === user.name) {
      setEditingName(false);
      return;
    }
    setSaving(true);
    try {
      await onUpdate(user.id, { name: nameValue.trim() });
      setEditingName(false);
    } finally {
      setSaving(false);
    }
  };

  const handleRoleChange = async (role: User["role"]) => {
    if (role === user.role) return;
    await onUpdate(user.id, { role });
  };

  const handleStatusChange = async (status: User["status"]) => {
    if (status === user.status) return;
    await onUpdate(user.id, { status });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-zinc-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">사용자 정보</h3>
          <button
            onClick={onClose}
            className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-700"
          >
            <X size={18} />
          </button>
        </div>

        {/* Avatar + Name */}
        <div className="mb-5 flex items-center gap-4">
          <UserAvatar name={user.name} avatar={user.avatar} size="lg" />
          <div className="flex-1">
            {editingName ? (
              <div className="flex items-center gap-2">
                <input
                  value={nameValue}
                  onChange={(e) => setNameValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleNameSave();
                    if (e.key === "Escape") setEditingName(false);
                  }}
                  className="w-full rounded border border-zinc-300 px-2 py-1 text-lg font-semibold dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-50"
                  autoFocus
                  disabled={saving}
                />
                <button
                  onClick={handleNameSave}
                  className="rounded p-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
                >
                  <Check size={16} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                  {user.name || "(이름 없음)"}
                </span>
                {canEditName && (
                  <button
                    onClick={() => setEditingName(true)}
                    className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-700"
                  >
                    <Pencil size={14} />
                  </button>
                )}
              </div>
            )}
            <p className="mt-0.5 text-sm text-zinc-500">{user.email}</p>
            {isSelf && (
              <span className="mt-1 inline-block rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                현재 로그인
              </span>
            )}
          </div>
        </div>

        {/* Info Fields */}
        <div className="space-y-4">
          {/* Role */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">역할</span>
            {canEditRole ? (
              <div className="flex gap-1">
                {roleOptions.map((opt) => {
                  const Icon = opt.icon;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => handleRoleChange(opt.value)}
                      className={cn(
                        "flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors",
                        user.role === opt.value
                          ? "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300"
                          : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200 dark:bg-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-600"
                      )}
                    >
                      <Icon size={12} />
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            ) : (
              <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700 dark:bg-purple-900 dark:text-purple-300">
                {user.role}
              </span>
            )}
          </div>

          {/* Status */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">상태</span>
            {canEditStatus ? (
              <div className="flex gap-1">
                {statusOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => handleStatusChange(opt.value)}
                    className={cn(
                      "rounded-lg px-2.5 py-1 text-xs font-medium transition-colors",
                      user.status === opt.value
                        ? opt.value === "active"
                          ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                          : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                        : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200 dark:bg-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-600"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            ) : (
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs font-medium",
                  user.status === "active"
                    ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                    : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                )}
              >
                {user.status === "active" ? "활성" : "비활성"}
              </span>
            )}
          </div>

          {/* Joined At */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">가입일</span>
            <span className="text-sm text-zinc-700 dark:text-zinc-300">{user.joinedAt}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
