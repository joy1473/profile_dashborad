"use client";

import { Search, Bell, Sun, Moon } from "lucide-react";
import { useDashboardStore } from "@/store/dashboard-store";
import { useTheme } from "@/components/layout/theme-provider";

export function Header() {
  const { searchQuery, setSearchQuery } = useDashboardStore();
  const { theme, toggleTheme } = useTheme();

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
        <button onClick={toggleTheme} className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800" data-testid="theme-toggle">
          {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
        </button>
        <button className="relative rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800" data-testid="notifications-btn">
          <Bell size={18} />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" />
        </button>
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-zinc-300 dark:bg-zinc-700" data-testid="user-avatar" />
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">관리자</span>
        </div>
      </div>
    </header>
  );
}
