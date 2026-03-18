"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { redirectToKakaoLogin } from "@/lib/kakao-auth";

export default function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace("/dashboard");
    });
  }, [router]);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="rounded-2xl bg-white dark:bg-zinc-900 shadow-xl p-8 text-center">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">SaaS Dashboard</h1>
          <p className="text-sm text-zinc-500 mb-8">로그인하여 시작하세요</p>

          <button
            onClick={redirectToKakaoLogin}
            className="w-full flex items-center justify-center gap-3 rounded-xl py-3 text-sm font-medium transition-colors"
            style={{ backgroundColor: "#FEE500", color: "#191919" }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path
                d="M12 3C6.48 3 2 6.36 2 10.5c0 2.67 1.74 5.01 4.36 6.36-.14.5-.9 3.22-.93 3.42 0 0-.02.15.07.21.1.06.2.03.2.03.27-.04 3.12-2.05 3.62-2.4.87.13 1.77.2 2.68.2 5.52 0 10-3.36 10-7.5S17.52 3 12 3z"
                fill="#191919"
              />
            </svg>
            카카오 로그인
          </button>
        </div>
      </div>
    </div>
  );
}
