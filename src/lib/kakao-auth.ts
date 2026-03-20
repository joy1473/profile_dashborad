import { supabase } from "./supabase";

const KAKAO_REST_API_KEY = process.env.NEXT_PUBLIC_KAKAO_REST_API_KEY ?? "";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export function redirectToKakaoLogin(): void {
  const state = crypto.randomUUID();
  // localStorage로 변경 — 모바일 인앱 브라우저/새 탭에서도 state 유지
  localStorage.setItem("kakao_oauth_state", state);

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

  // 카카오가 에러로 리다이렉트한 경우 (개발모드 차단, 사용자 취소 등)
  const kakaoError = params.get("error");
  const kakaoErrorDesc = params.get("error_description");
  if (kakaoError) {
    const msg = kakaoErrorDesc || kakaoError;
    throw new Error(`카카오 인증 실패: ${msg}`);
  }

  const code = params.get("code");
  const state = params.get("state");
  const savedState = localStorage.getItem("kakao_oauth_state");

  if (!code) return false;

  // CSRF 검증 — savedState 없으면 거부
  if (!savedState || state !== savedState) {
    throw new Error("CSRF 검증 실패: 다른 탭에서 로그인을 시도했거나 세션이 만료되었습니다.");
  }
  localStorage.removeItem("kakao_oauth_state");

  const redirectUri = `${window.location.origin}/auth/kakao/callback`;

  const res = await fetch(`${SUPABASE_URL}/functions/v1/kakao-auth-dashboard`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ code, redirect_uri: redirectUri }),
  });

  if (!res.ok) {
    let errorMsg = "카카오 로그인 실패";
    try {
      const err = await res.json();
      errorMsg = err.error ?? errorMsg;
    } catch {
      errorMsg = `서버 오류 (${res.status})`;
    }
    throw new Error(errorMsg);
  }

  const { token, type } = await res.json();

  const { error } = await supabase.auth.verifyOtp({
    token_hash: token,
    type: type ?? "magiclink",
  });

  if (error) {
    throw new Error(`세션 생성 실패: ${error.message}`);
  }

  // 세션이 안정화될 때까지 대기 — layout auth guard와의 레이스 컨디션 방지
  let retries = 0;
  while (retries < 10) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) return true;
    await new Promise((r) => setTimeout(r, 200));
    retries++;
  }
  return true;
}
