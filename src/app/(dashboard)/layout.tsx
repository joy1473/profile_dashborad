"use client";

import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <Sidebar />
      <div className="lg:pl-64">
        <Header />
        <main className="p-6" data-testid="main-content">
          {children}
        </main>
      </div>
    </div>
  );
}
