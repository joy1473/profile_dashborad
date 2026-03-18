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
        </div>
      </div>
    </ToastProvider>
  );
}
