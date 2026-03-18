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
    getSession().then((s) => {
      if (!s) {
        router.replace("/login");
      } else {
        setSession(s);
      }
      setLoading(false);
    });

    const { data: { subscription } } = onAuthStateChange((s) => {
      setSession(s);
      if (!s) router.replace("/login");
    });

    return () => subscription.unsubscribe();
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
          <footer className="px-6 py-3 text-center text-xs text-zinc-400 dark:text-zinc-600 border-t border-zinc-200 dark:border-zinc-800">
            copyright&copy; 2005 The Polestar All rights reserved. &nbsp;|&nbsp; 사업자등록번호 : 110-11-23776 &nbsp;|&nbsp; 대표자 : 조은아 &nbsp;|&nbsp; 서울특별시 강서구 양천로 500, 8층 810호(등촌동, 노블리움오피스텔) &nbsp;|&nbsp; joytec@naver.com
          </footer>
        </div>
      </div>
    </ToastProvider>
  );
}
