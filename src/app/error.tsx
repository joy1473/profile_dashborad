"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // 운영 환경에서 에러 수집 (향후 Sentry 등 연동 가능)
    if (process.env.NODE_ENV === "production") {
      fetch("/api/auth-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "클라이언트 오류",
          target: `${error.name}: ${error.message}`,
        }),
      }).catch(() => {});
    }
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4">
      <div className="rounded-2xl bg-white dark:bg-zinc-900 shadow-xl p-8 text-center max-w-md">
        <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 mb-2">오류가 발생했습니다</h2>
        <p className="text-sm text-zinc-500 mb-4">
          일시적인 문제일 수 있습니다. 다시 시도해주세요.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
          >
            다시 시도
          </button>
          <button
            onClick={() => (window.location.href = "/dashboard")}
            className="px-4 py-2 border border-zinc-300 text-zinc-600 text-sm rounded-lg hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400"
          >
            대시보드로 이동
          </button>
        </div>
      </div>
    </div>
  );
}
