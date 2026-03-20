"use client";

import { useEffect, useState } from "react";
import { handleKakaoCallback } from "@/lib/kakao-auth";
import { supabase } from "@/lib/supabase";

export default function KakaoCallbackPage() {
  const [status, setStatus] = useState("로그인 처리 중...");
  const [error, setError] = useState("");
  const [debugLog, setDebugLog] = useState<string[]>([]);

  const log = (msg: string) => {
    console.log(`[KAKAO CB] ${msg}`);
    setDebugLog((prev) => [...prev, `${new Date().toISOString().slice(11, 19)} ${msg}`]);
  };

  useEffect(() => {
    const run = async () => {
      try {
        log("콜백 시작: " + window.location.search.slice(0, 100));

        setStatus("카카오 인증 처리 중...");
        const ok = await handleKakaoCallback();
        log(`handleKakaoCallback 결과: ${ok}`);

        if (!ok) {
          log("콜백 결과 false — 로그인 페이지로 이동");
          setError("인증 코드를 찾을 수 없습니다.");
          return;
        }

        setStatus("세션 확인 중...");

        // 세션이 실제로 있는지 최종 확인
        const { data: { session } } = await supabase.auth.getSession();
        log(`세션 확인: ${session ? "있음 (user: " + session.user.email + ")" : "없음"}`);

        if (session) {
          setStatus("로그인 성공! 대시보드로 이동합니다...");
          log("세션 확인 완료 — 대시보드 이동");
          // 충분한 대기 후 전체 리로드
          await new Promise((r) => setTimeout(r, 500));
          window.location.href = "/dashboard";
        } else {
          // 세션이 없으면 추가 대기 후 재확인
          log("세션 없음 — 추가 대기 중...");
          setStatus("세션 안정화 대기 중...");
          await new Promise((r) => setTimeout(r, 1000));

          const { data: { session: retrySession } } = await supabase.auth.getSession();
          log(`재확인: ${retrySession ? "있음" : "여전히 없음"}`);

          if (retrySession) {
            setStatus("로그인 성공! 대시보드로 이동합니다...");
            window.location.href = "/dashboard";
          } else {
            setError("세션 생성에 실패했습니다. 다시 시도해주세요.");
            log("최종 실패 — 세션 생성 안됨");
          }
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "알 수 없는 오류";
        log(`오류: ${message}`);
        setError(message);

        fetch("/api/auth-log", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "로그인 실패", target: message }),
        }).catch(() => {});
      }
    };

    run();
  }, []);

  if (error) {
    const isKakaoBlock = error.includes("카카오 인증 실패") || error.includes("access_denied");
    const isCsrf = error.includes("CSRF");

    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center p-4">
        <div className="rounded-2xl bg-white dark:bg-zinc-900 shadow-xl p-8 text-center max-w-md">
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
            onClick={() => (window.location.href = "/login")}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 mb-4"
          >
            다시 로그인
          </button>

          {/* 디버그 로그 */}
          <details className="text-left mt-4">
            <summary className="text-xs text-gray-400 cursor-pointer">디버그 로그</summary>
            <pre className="text-[10px] text-gray-400 mt-2 bg-gray-50 p-2 rounded max-h-40 overflow-auto">
              {debugLog.join("\n")}
            </pre>
          </details>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center gap-3">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      <p className="text-zinc-500 text-sm">{status}</p>

      {/* 디버그 로그 */}
      {debugLog.length > 0 && (
        <details className="mt-4 max-w-sm">
          <summary className="text-xs text-gray-400 cursor-pointer">처리 상태</summary>
          <pre className="text-[10px] text-gray-400 mt-2 bg-gray-100 p-2 rounded max-h-40 overflow-auto">
            {debugLog.join("\n")}
          </pre>
        </details>
      )}
    </div>
  );
}
