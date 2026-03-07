"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { users as allUsers } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

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
  const filtered = filter === "all" ? allUsers : allUsers.filter((u) => u.status === filter);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50" data-testid="page-title">사용자</h2>
        <div className="flex gap-2" data-testid="user-filters">
          {(["all", "active", "inactive"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                filter === f ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400"
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
          <table className="w-full text-sm" data-testid="users-table">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800">
                <th className="pb-3 text-left font-medium text-zinc-500">이름</th>
                <th className="pb-3 text-left font-medium text-zinc-500">이메일</th>
                <th className="pb-3 text-left font-medium text-zinc-500">역할</th>
                <th className="pb-3 text-left font-medium text-zinc-500">상태</th>
                <th className="pb-3 text-left font-medium text-zinc-500">가입일</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((user) => (
                <tr key={user.id} className="border-b border-zinc-100 last:border-0 dark:border-zinc-800" data-testid={`user-row-${user.id}`}>
                  <td className="py-3 font-medium text-zinc-900 dark:text-zinc-50">{user.name}</td>
                  <td className="py-3 text-zinc-600 dark:text-zinc-400">{user.email}</td>
                  <td className="py-3">
                    <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", roleColors[user.role])}>{user.role}</span>
                  </td>
                  <td className="py-3">
                    <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", statusColors[user.status])}>
                      {user.status === "active" ? "활성" : "비활성"}
                    </span>
                  </td>
                  <td className="py-3 text-zinc-500">{user.joinedAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
