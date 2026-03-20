"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { ToastProvider } from "@/components/ui/toast";
import { DashboardSkeleton } from "@/components/skeletons/dashboard-skeleton";
import { getSession, onAuthStateChange } from "@/lib/auth";
import type { Session } from "@supabase/supabase-js";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    console.log("[LAYOUT] 세션 체크 시작");
    getSession().then(async (s) => {
      if (!mounted) return;
      console.log("[LAYOUT] 1차 세션:", s ? `있음 (${s.user.email})` : "없음");
      if (s) {
        setSession(s);
        setLoading(false);
      } else {
        // 카카오 콜백 직후 세션 안정화 대기 (레이스 컨디션 방지)
        console.log("[LAYOUT] 세션 없음 — 1초 대기 후 재확인");
        await new Promise((r) => setTimeout(r, 1000));
        if (!mounted) return;
        const retry = await getSession().catch(() => null);
        console.log("[LAYOUT] 2차 세션:", retry ? `있음 (${retry.user.email})` : "여전히 없음");
        if (retry) {
          setSession(retry);
          setLoading(false);
        } else {
          const currentPath = window.location.pathname;
          console.log("[LAYOUT] 세션 없음 확정 → /login 이동 (from:", currentPath, ")");
          router.replace(`/login?redirect=${encodeURIComponent(currentPath)}`);
          setLoading(false);
        }
      }
    });

    const { data: { subscription } } = onAuthStateChange((s) => {
      if (!mounted) return;
      if (s) {
        setSession(s);
        setLoading(false);
      } else if (!loading) {
        router.replace("/login");
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [router]);

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (!session) return null;

  return (
    <ToastProvider>
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
        <Sidebar />
        <div className="lg:pl-64">
          <Header />
          <main className="p-6" data-testid="main-content">
            {children}
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
