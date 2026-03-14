import { supabase } from "./supabase";

const KAKAO_REST_API_KEY = process.env.NEXT_PUBLIC_KAKAO_REST_API_KEY ?? "";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

export function redirectToKakaoLogin(): void {
  const state = crypto.randomUUID();
  sessionStorage.setItem("kakao_oauth_state", state);

  const redirectUri = `${window.location.origin}/auth/kakao/callback`;
  const params = new URLSearchParams({
    client_id: KAKAO_REST_API_KEY,
    redirect_uri: redirectUri,
    response_type: "code",
    state,
  });
  window.location.href = `https://kauth.kakao.com/oauth/authorize?${params}`;
}

export function isKakaoCallback(): boolean {
  return window.location.pathname === "/auth/kakao/callback" && window.location.search.includes("code=");
}

export async function handleKakaoCallback(): Promise<boolean> {
  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");
  const state = params.get("state");
  const savedState = sessionStorage.getItem("kakao_oauth_state");

  if (!code) return false;
  if (state !== savedState) {
    throw new Error("CSRF 검증 실패");
  }
  sessionStorage.removeItem("kakao_oauth_state");

  const redirectUri = `${window.location.origin}/auth/kakao/callback`;

  const res = await fetch(`${SUPABASE_URL}/functions/v1/kakao-auth-dashboard`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, redirect_uri: redirectUri }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error ?? "카카오 로그인 실패");
  }

  const { token, type } = await res.json();

  const { error } = await supabase.auth.verifyOtp({
    token_hash: token,
    type: type ?? "magiclink",
  });

  if (error) throw error;
  return true;
}
