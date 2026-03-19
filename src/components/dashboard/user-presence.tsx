"use client";

import { useState, useEffect } from "react";
import { Users, Circle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatRelativeTime } from "@/lib/utils";
import { Card } from "@/components/ui/card";

interface PresenceInfo {
  id: string;
  name: string;
  avatar?: string;
  lastSeen: string;
  online: boolean;
}

export function UserPresence() {
  const [users, setUsers] = useState<PresenceInfo[]>([]);

  useEffect(() => {
    loadUsers();
    // 30초마다 갱신
    const interval = setInterval(loadUsers, 30000);
    return () => clearInterval(interval);
  }, []);

  async function loadUsers() {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      setUsers(mockPresence);
      return;
    }

    try {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, name, avatar_url, last_sign_in_at, status")
        .order("last_sign_in_at", { ascending: false, nullsFirst: false })
        .limit(20);

      const { data: activities } = await supabase
        .from("activities")
        .select("user_id, created_at")
        .order("created_at", { ascending: false })
        .limit(50);

      const activityMap = new Map<string, string>();
      for (const a of activities ?? []) {
        if (a.user_id && !activityMap.has(a.user_id)) {
          activityMap.set(a.user_id, a.created_at);
        }
      }

      const now = Date.now();
      setUsers(
        (profiles ?? []).map((p) => {
          const lastActivity = activityMap.get(p.id) ?? p.last_sign_in_at;
          const diff = lastActivity ? now - new Date(lastActivity).getTime() : Infinity;
          return {
            id: p.id,
            name: p.name ?? "사용자",
            avatar: p.avatar_url ?? undefined,
            lastSeen: lastActivity ? formatRelativeTime(lastActivity) : "-",
            online: diff < 5 * 60 * 1000, // 5분 이내 활동 → 온라인
          };
        })
      );
    } catch {
      setUsers(mockPresence);
    }
  }

  const onlineCount = users.filter((u) => u.online).length;

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
          <Users size={16} />
          접속 현황
        </h3>
        <span className="text-xs font-medium text-green-600 dark:text-green-400">
          {onlineCount}명 온라인
        </span>
      </div>
      <div className="space-y-3 max-h-64 overflow-y-auto">
        {users.map((user) => (
          <div key={user.id} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                {user.avatar ? (
                  <img src={user.avatar} alt="" className="h-8 w-8 rounded-full object-cover" />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-600 dark:text-zinc-300">
                    {user.name[0]}
                  </div>
                )}
                <Circle
                  size={10}
                  className={`absolute -bottom-0.5 -right-0.5 ${
                    user.online
                      ? "fill-green-500 text-green-500"
                      : "fill-zinc-300 text-zinc-300 dark:fill-zinc-600 dark:text-zinc-600"
                  }`}
                />
              </div>
              <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50">{user.name}</span>
            </div>
            <span className={`text-xs ${user.online ? "text-green-600 dark:text-green-400" : "text-zinc-400"}`}>
              {user.online ? "접속 중" : user.lastSeen}
            </span>
          </div>
        ))}
        {users.length === 0 && (
          <p className="text-sm text-zinc-400 text-center py-4">사용자 정보 없음</p>
        )}
      </div>
    </Card>
  );
}


const mockPresence: PresenceInfo[] = [
  { id: "1", name: "조은아", online: true, lastSeen: "접속 중" },
  { id: "2", name: "신인숙", online: true, lastSeen: "접속 중" },
  { id: "3", name: "김민수", online: false, lastSeen: "2시간 전" },
  { id: "4", name: "이지영", online: false, lastSeen: "1일 전" },
];
