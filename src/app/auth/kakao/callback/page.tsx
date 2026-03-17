"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { handleKakaoCallback } from "@/lib/kakao-auth";

export default function KakaoCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState("");

  useEffect(() => {
    handleKakaoCallback()
      .then((ok) => {
        if (ok) {
          router.replace("/dashboard");
        } else {
          router.replace("/login");
        }
      })
      .catch((err) => {
        const message = err.message || "알 수 없는 오류";
        setError(message);
        fetch("/api/auth-log", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "로그인 실패",
            target: message,
          }),
        }).catch(() => {});
      });
  }, [router]);

  if (error) {
    // 에러 유형별 안내 메시지
    const isKakaoBlock = error.includes("카카오 인증 실패") || error.includes("access_denied");
    const isCsrf = error.includes("CSRF");

    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center p-4">
        <div className="rounded-2xl bg-white dark:bg-zinc-900 shadow-xl p-8 text-center max-w-sm">
          <p className="text-red-600 font-semibold mb-2">로그인 실패</p>
          <p className="text-sm text-zinc-500 mb-4">{error}</p>
          {isKakaoBlock && (
            <p className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3 mb-4">
              카카오 앱이 개발 모드일 수 있습니다. 관리자에게 문의하세요.
            </p>
          )}
          {isCsrf && (
            <p className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3 mb-4">
              브라우저 세션이 만료되었습니다. 다시 시도해주세요.
            </p>
          )}
          <button
            onClick={() => router.replace("/login")}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
          >
            다시 로그인
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center gap-3">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      <p className="text-zinc-500 text-sm">로그인 처리 중...</p>
    </div>
  );
}
