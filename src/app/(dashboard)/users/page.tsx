"use client";

import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { UserAvatar } from "@/components/users/user-avatar";
import { UserModal } from "@/components/users/user-modal";
import { useToast } from "@/components/ui/toast";
import { fetchProfiles, updateProfile } from "@/lib/users";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import type { User, UpdateProfileInput } from "@/types";

const roleColors = {
  admin: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
  user: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  viewer: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
};

const statusColors = {
  active: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  inactive: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
};

export default function UsersPage() {
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<User["role"] | null>(null);
  const { showToast } = useToast();

  // Modal state
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    fetchProfiles().then((data) => {
      setUsers(data);
      setLoading(false);
    });
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id ?? null);
    });
  }, []);

  // currentUser의 role 파악
  useEffect(() => {
    if (currentUserId && users.length > 0) {
      const me = users.find((u) => u.id === currentUserId);
      setCurrentUserRole(me?.role ?? null);
    }
  }, [currentUserId, users]);

  const isAdmin = currentUserRole === "admin";

  const handleUpdate = useCallback(
    async (userId: string, input: UpdateProfileInput) => {
      const original = users.find((u) => u.id === userId);
      if (!original) return;
      if (!isAdmin && userId !== currentUserId) {
        showToast("관리자만 다른 사용자의 프로필을 수정할 수 있습니다");
        return;
      }

      // Optimistic update
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, ...input } : u))
      );
      // 모달에도 반영
      setSelectedUser((prev) =>
        prev && prev.id === userId ? { ...prev, ...input } : prev
      );

      try {
        const updated = await updateProfile(userId, input);
        setUsers((prev) => prev.map((u) => (u.id === userId ? updated : u)));
        setSelectedUser((prev) =>
          prev && prev.id === userId ? updated : prev
        );
        showToast("프로필이 수정되었습니다", "success");
      } catch (err) {
        // Rollback
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? original : u))
        );
        setSelectedUser((prev) =>
          prev && prev.id === userId ? original : prev
        );
        showToast(
          err instanceof Error ? err.message : "프로필 수정에 실패했습니다"
        );
      }
    },
    [users, showToast]
  );

  const handleRowClick = (user: User) => {
    setSelectedUser(user);
    setModalOpen(true);
  };

  const filtered =
    filter === "all" ? users : users.filter((u) => u.status === filter);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2
          className="text-2xl font-bold text-zinc-900 dark:text-zinc-50"
          data-testid="page-title"
        >
          사용자
        </h2>
        <div className="flex gap-2" data-testid="user-filters">
          {(["all", "active", "inactive"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                filter === f
                  ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400"
              )}
              data-testid={`filter-${f}`}
            >
              {f === "all" ? "전체" : f === "active" ? "활성" : "비활성"}
            </button>
          ))}
        </div>
      </div>

      <Card>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-zinc-400">
              로딩 중...
            </div>
          ) : (
            <table className="w-full text-sm" data-testid="users-table">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <th className="pb-3 text-left font-medium text-zinc-500">
                    이름
                  </th>
                  <th className="pb-3 text-left font-medium text-zinc-500">
                    이메일
                  </th>
                  <th className="pb-3 text-left font-medium text-zinc-500">
                    역할
                  </th>
                  <th className="pb-3 text-left font-medium text-zinc-500">
                    상태
                  </th>
                  <th className="pb-3 text-left font-medium text-zinc-500">
                    가입일
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((user) => (
                  <tr
                    key={user.id}
                    onClick={() => handleRowClick(user)}
                    className={cn(
                      "cursor-pointer border-b border-zinc-100 last:border-0 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800/50",
                      currentUserId === user.id &&
                        "bg-blue-50/50 dark:bg-blue-950/20"
                    )}
                    data-testid={`user-row-${user.id}`}
                  >
                    <td className="py-3">
                      <div className="flex items-center gap-2.5">
                        <UserAvatar
                          name={user.name}
                          avatar={user.avatar}
                          size="sm"
                        />
                        <span className="font-medium text-zinc-900 dark:text-zinc-50">
                          {user.name || "(이름 없음)"}
                        </span>
                        {currentUserId === user.id && (
                          <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-600 dark:bg-blue-900 dark:text-blue-300">
                            나
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 text-zinc-600 dark:text-zinc-400">
                      {user.email}
                    </td>
                    <td className="py-3">
                      {isAdmin ? (
                        <select
                          value={user.role}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleUpdate(user.id, { role: e.target.value as User["role"] });
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className={cn(
                            "cursor-pointer rounded-full border-0 px-2 py-0.5 text-xs font-medium outline-none",
                            roleColors[user.role]
                          )}
                        >
                          <option value="admin">admin</option>
                          <option value="user">user</option>
                          <option value="viewer">viewer</option>
                        </select>
                      ) : (
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-xs font-medium",
                            roleColors[user.role]
                          )}
                        >
                          {user.role}
                        </span>
                      )}
                    </td>
                    <td className="py-3">
                      {isAdmin ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUpdate(user.id, {
                              status: user.status === "active" ? "inactive" : "active",
                            });
                          }}
                          className={cn(
                            "rounded-full px-2 py-0.5 text-xs font-medium transition-colors hover:opacity-80",
                            statusColors[user.status]
                          )}
                        >
                          {user.status === "active" ? "활성" : "비활성"}
                        </button>
                      ) : (
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-xs font-medium",
                            statusColors[user.status]
                          )}
                        >
                          {user.status === "active" ? "활성" : "비활성"}
                        </span>
                      )}
                    </td>
                    <td className="py-3 text-zinc-500">{user.joinedAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      <UserModal
        user={selectedUser}
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedUser(null);
        }}
        onUpdate={handleUpdate}
        currentUserId={currentUserId}
        isAdmin={isAdmin}
      />
    </div>
  );
}
