"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, Bell, Sun, Moon, Monitor, LogOut, Download, Share, X, Check } from "lucide-react";
import { useDashboardStore } from "@/store/dashboard-store";
import { useTheme } from "@/components/layout/theme-provider";
import { supabase } from "@/lib/supabase";
import { getDisplayName, getAvatarUrl, signOut } from "@/lib/auth";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface Notification {
  id: string;
  title: string;
  body: string;
  link: string;
  is_read: boolean;
  created_at: string;
}

function isIOS() {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.userAgent.includes("Mac") && "ontouchend" in document);
}

function isStandalone() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(display-mode: standalone)").matches || ("standalone" in navigator && (navigator as Record<string, unknown>).standalone === true);
}

const SEARCH_PAGES = [
  { href: "/dashboard", label: "일정", keywords: ["일정", "캘린더", "스케줄", "calendar"] },
  { href: "/analytics", label: "입찰문서", keywords: ["입찰", "문서", "분석", "제안", "bid"] },
  { href: "/users", label: "사용자", keywords: ["사용자", "유저", "관리자", "user"] },
  { href: "/qr-cards", label: "QR 명함", keywords: ["qr", "명함", "카드", "프로필"] },
  { href: "/board", label: "보드", keywords: ["보드", "칸반", "이슈", "할일", "board", "kanban"] },
  { href: "/graph", label: "SW역량", keywords: ["역량", "스킬", "그래프", "프로필", "skill", "graph"] },
  { href: "/settings", label: "회의", keywords: ["회의", "미팅", "화상", "meeting", "jitsi"] },
];

export function Header() {
  const { searchQuery, setSearchQuery } = useDashboardStore();
  const { mode, setMode } = useTheme();
  const router = useRouter();
  const [searchResults, setSearchResults] = useState<typeof SEARCH_PAGES>([]);
  const [displayName, setDisplayName] = useState("사용자");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // 알림
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const fetchNotifications = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setCurrentUserId(user.id);
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);
    if (data) setNotifications(data);
  }, []);

  const markAsRead = async (id: string) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
  };

  const markAllAsRead = async () => {
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
    if (unreadIds.length === 0) return;
    await supabase.from("notifications").update({ is_read: true }).in("id", unreadIds);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setDisplayName(getDisplayName(user));
        setAvatarUrl(getAvatarUrl(user));
      }
    });

    fetchNotifications();

    // 실시간 알림 구독
    const channel = supabase
      .channel("notifications")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, () => {
        fetchNotifications();
      })
      .subscribe();

    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);

    if (isIOS() && !isStandalone() && !localStorage.getItem("ios-pwa-dismissed")) {
      setShowIOSGuide(true);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      supabase.removeChannel(channel);
    };
  }, [fetchNotifications]);

  // 바깥 클릭 시 알림 패널 닫기
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    };
    if (showNotifications) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showNotifications]);

  return (
    <>
    <header className="flex h-16 items-center justify-between border-b border-zinc-200 px-6 dark:border-zinc-800" data-testid="header">
      <div className="relative w-72">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
        <input
          type="text"
          placeholder="페이지 검색... (일정, 회의, 보드...)"
          value={searchQuery}
          onChange={(e) => {
            const q = e.target.value;
            setSearchQuery(q);
            if (q.trim()) {
              const lower = q.toLowerCase();
              setSearchResults(SEARCH_PAGES.filter((p) => p.label.includes(q) || p.keywords.some((k) => k.includes(lower))));
            } else {
              setSearchResults([]);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && searchResults.length > 0) {
              router.push(searchResults[0].href);
              setSearchQuery("");
              setSearchResults([]);
            }
          }}
          className="w-full rounded-lg border border-zinc-200 bg-zinc-50 py-2 pl-9 pr-4 text-sm outline-none focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-500"
          data-testid="search-input"
        />
        {searchResults.length > 0 && (
          <div className="absolute left-0 top-11 z-50 w-full rounded-lg border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
            {searchResults.map((p) => (
              <button
                key={p.href}
                onClick={() => { router.push(p.href); setSearchQuery(""); setSearchResults([]); }}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                <Search size={14} className="text-zinc-400" /> {p.label}
              </button>
            ))}
          </div>
        )}
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
            aria-label="앱 설치"
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
          aria-label={mode === "light" ? "라이트 모드" : mode === "dark" ? "다크 모드" : "시스템 모드"}
        >
          {mode === "light" && <Sun size={18} />}
          {mode === "dark" && <Moon size={18} />}
          {mode === "system" && <Monitor size={18} />}
        </button>

        {/* 알림 */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            data-testid="notifications-btn"
            aria-label="알림"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-12 z-50 w-80 rounded-lg border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
              <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">알림</h3>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                  >
                    <Check size={12} /> 모두 읽음
                  </button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="px-4 py-8 text-center text-xs text-zinc-400">알림이 없습니다</p>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => {
                        markAsRead(n.id);
                        if (n.link) window.location.href = n.link;
                      }}
                      className={`cursor-pointer border-b border-zinc-50 px-4 py-3 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800 ${!n.is_read ? "bg-blue-50 dark:bg-blue-950" : ""}`}
                    >
                      <p className={`text-sm ${!n.is_read ? "font-semibold text-zinc-900 dark:text-zinc-50" : "text-zinc-600 dark:text-zinc-400"}`}>
                        {n.title}
                      </p>
                      {n.body && <p className="mt-0.5 text-xs text-zinc-500">{n.body}</p>}
                      <p className="mt-1 text-[10px] text-zinc-400">
                        {new Date(n.created_at).toLocaleString("ko-KR")}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

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
          aria-label="로그아웃"
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>

    {showIOSGuide && (
      <div className="flex items-center justify-between gap-3 border-b border-blue-200 bg-blue-50 px-6 py-3 dark:border-blue-900 dark:bg-blue-950">
        <div className="flex items-center gap-3 text-sm text-blue-800 dark:text-blue-200">
          <Share size={18} className="shrink-0" />
          <span>
            홈 화면에 추가하려면 Safari 하단의{" "}
            <strong>공유 버튼(⎙)</strong> →{" "}
            <strong>&quot;홈 화면에 추가&quot;</strong>를 눌러주세요
          </span>
        </div>
        <button
          onClick={() => {
            setShowIOSGuide(false);
            localStorage.setItem("ios-pwa-dismissed", "1");
          }}
          className="shrink-0 rounded p-1 text-blue-600 hover:bg-blue-100 dark:text-blue-400 dark:hover:bg-blue-900"
          aria-label="iOS 설치 안내 닫기"
        >
          <X size={16} />
        </button>
      </div>
    )}
    </>
  );
}
