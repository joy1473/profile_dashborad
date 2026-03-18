"use client";

import { useEffect, useState } from "react";
import { Search, Bell, Sun, Moon, Monitor, LogOut, Download } from "lucide-react";
import { useDashboardStore } from "@/store/dashboard-store";
import { useTheme } from "@/components/layout/theme-provider";
import { supabase } from "@/lib/supabase";
import { getDisplayName, getAvatarUrl, signOut } from "@/lib/auth";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function Header() {
  const { searchQuery, setSearchQuery } = useDashboardStore();
  const { mode, setMode } = useTheme();
  const [displayName, setDisplayName] = useState("사용자");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setDisplayName(getDisplayName(user));
        setAvatarUrl(getAvatarUrl(user));
      }
    });

    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  return (
    <header className="flex h-16 items-center justify-between border-b border-zinc-200 px-6 dark:border-zinc-800" data-testid="header">
      <div className="relative w-72">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
        <input
          type="text"
          placeholder="검색..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-lg border border-zinc-200 bg-zinc-50 py-2 pl-9 pr-4 text-sm outline-none focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-500"
          data-testid="search-input"
        />
      </div>
      <div className="flex items-center gap-4">
        {installPrompt && (
          <button
            onClick={async () => {
              await installPrompt.prompt();
              const { outcome } = await installPrompt.userChoice;
              if (outcome === "accepted") setInstallPrompt(null);
            }}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors"
            title="앱 설치"
          >
            <Download size={14} />
            앱 설치
          </button>
        )}
        <button
          onClick={() => {
            const next = mode === "light" ? "dark" : mode === "dark" ? "system" : "light";
            setMode(next);
          }}
          className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          data-testid="theme-toggle"
          title={mode === "light" ? "라이트 모드" : mode === "dark" ? "다크 모드" : "시스템 모드"}
        >
          {mode === "light" && <Sun size={18} />}
          {mode === "dark" && <Moon size={18} />}
          {mode === "system" && <Monitor size={18} />}
        </button>
        <button className="relative rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800" data-testid="notifications-btn">
          <Bell size={18} />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" />
        </button>
        <div className="flex items-center gap-2">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="h-8 w-8 rounded-full object-cover" data-testid="user-avatar" />
          ) : (
            <div className="h-8 w-8 rounded-full bg-zinc-300 dark:bg-zinc-700" data-testid="user-avatar" />
          )}
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{displayName}</span>
        </div>
        <button
          onClick={signOut}
          className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          title="로그아웃"
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}
