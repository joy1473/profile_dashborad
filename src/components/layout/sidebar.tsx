"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, BarChart3, Users, Video, QrCode, Columns3, Network, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/chat", label: "문서RAG", icon: MessageSquare },
  { href: "/dashboard", label: "일정", icon: CalendarDays },
  { href: "/analytics", label: "입찰문서", icon: BarChart3 },
  { href: "/board", label: "보드", icon: Columns3 },
  { href: "/graph", label: "SW역량", icon: Network },
  { href: "/users", label: "사용자", icon: Users },
  { href: "/qr-cards", label: "QR명함", icon: QrCode },
  { href: "/settings", label: "회의", icon: Video },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1 px-2 overflow-x-auto scrollbar-hide" data-testid="sidebar-nav">
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors",
              isActive
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
            )}
            data-testid={`nav-${item.href.slice(1)}`}
          >
            <item.icon size={14} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
