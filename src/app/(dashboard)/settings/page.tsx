"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";

export default function SettingsPage() {
  const [notifications, setNotifications] = useState({ email: true, push: false, weekly: true });
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  async function handleSaveProfile() {
    setSaving(true);
    setSaveMessage("");
    try {
      const nameInput = document.querySelector<HTMLInputElement>('[data-testid="profile-name"]');
      if (!nameInput?.value) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setSaveMessage("로그인이 필요합니다");
        return;
      }

      const res = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, name: nameInput.value }),
      });

      if (!res.ok) {
        setSaveMessage("저장에 실패했습니다");
        return;
      }
      setSaveMessage("저장되었습니다");
      setTimeout(() => setSaveMessage(""), 3000);
    } catch {
      setSaveMessage("저장에 실패했습니다");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h2 className="mb-6 text-2xl font-bold text-zinc-900 dark:text-zinc-50" data-testid="page-title">설정</h2>

      <div className="space-y-6">
        <Card data-testid="profile-section">
          <h3 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">프로필</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">이름</label>
              <input
                type="text"
                defaultValue="관리자"
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900"
                data-testid="profile-name"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">이메일</label>
              <input
                type="email"
                defaultValue="admin@example.com"
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900"
                data-testid="profile-email"
              />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={handleSaveProfile}
              disabled={saving}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
              data-testid="save-profile"
            >
              {saving ? "저장 중..." : "저장"}
            </button>
            {saveMessage && (
              <span className={`text-sm ${saveMessage.includes("실패") || saveMessage.includes("필요") ? "text-red-500" : "text-green-600"}`}>
                {saveMessage}
              </span>
            )}
          </div>
        </Card>

        <Card data-testid="notifications-section">
          <h3 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">알림 설정</h3>
          <div className="space-y-3">
            {([
              { key: "email" as const, label: "이메일 알림", desc: "중요한 업데이트를 이메일로 받습니다" },
              { key: "push" as const, label: "푸시 알림", desc: "브라우저 푸시 알림을 받습니다" },
              { key: "weekly" as const, label: "주간 리포트", desc: "매주 월요일 요약 리포트를 받습니다" },
            ]).map((item) => (
              <div key={item.key} className="flex items-center justify-between rounded-lg border border-zinc-100 p-4 dark:border-zinc-800">
                <div>
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">{item.label}</p>
                  <p className="text-xs text-zinc-500">{item.desc}</p>
                </div>
                <button
                  onClick={() => setNotifications((prev) => ({ ...prev, [item.key]: !prev[item.key] }))}
                  className={`relative h-6 w-11 rounded-full transition-colors ${notifications[item.key] ? "bg-blue-500" : "bg-zinc-300 dark:bg-zinc-700"}`}
                  data-testid={`toggle-${item.key}`}
                >
                  <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform shadow-sm ${notifications[item.key] ? "translate-x-5" : ""}`} />
                </button>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
