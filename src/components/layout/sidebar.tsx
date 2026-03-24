"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, BarChart3, Users, Video, Menu, X, QrCode, Columns3, Network } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDashboardStore } from "@/store/dashboard-store";

const navItems = [
  { href: "/dashboard", label: "일정", icon: CalendarDays },
  { href: "/analytics", label: "입찰문서", icon: BarChart3 },
  { href: "/users", label: "사용자", icon: Users },
  { href: "/qr-cards", label: "QR 명함", icon: QrCode },
  { href: "/board", label: "보드", icon: Columns3 },
  { href: "/graph", label: "SW역량", icon: Network },
  { href: "/settings", label: "회의", icon: Video },
];

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen, toggleSidebar } = useDashboardStore();

  return (
    <>
      <button
        onClick={toggleSidebar}
        className="fixed top-4 left-4 z-50 rounded-lg bg-white p-2 shadow-md lg:hidden dark:bg-zinc-900"
        aria-label="메뉴 열기/닫기"
        data-testid="sidebar-toggle"
      >
        {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* 모바일 오버레이 */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/30 lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      <aside
        className={cn(
          "fixed left-0 top-0 z-40 h-full w-64 flex flex-col border-r border-zinc-200 bg-white transition-transform dark:border-zinc-800 dark:bg-zinc-950",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
          "lg:translate-x-0"
        )}
        data-testid="sidebar"
      >
        <div className="flex h-16 items-center border-b border-zinc-200 px-6 dark:border-zinc-800">
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">SaaS Dashboard</h1>
        </div>

        <nav className="mt-6 px-3 flex-1" data-testid="sidebar-nav">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => { if (sidebarOpen) toggleSidebar(); }}
                className={cn(
                  "mb-1 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50"
                    : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-50"
                )}
                data-testid={`nav-${item.href.slice(1)}`}
              >
                <item.icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="px-4 py-3 border-t border-zinc-200 dark:border-zinc-800 text-[10px] leading-relaxed text-zinc-400 dark:text-zinc-600">
          <p>copyright&copy; 2005-{new Date().getFullYear()} {process.env.NEXT_PUBLIC_COMPANY_NAME ?? "The Polestar"}</p>
          <p>사업자등록번호 : {process.env.NEXT_PUBLIC_BIZ_REG_NO ?? ""}</p>
          <p>대표자 : {process.env.NEXT_PUBLIC_REPRESENTATIVE ?? ""}</p>
          <p>{process.env.NEXT_PUBLIC_ADDRESS ?? ""}</p>
          <a href="/privacy" className="text-blue-500 hover:underline mt-1 inline-block">개인정보처리방침</a>
        </div>
      </aside>
    </>
  );
}
