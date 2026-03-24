/**
 * 환경변수 유효성 검증
 * 빌드 시점에 필수 환경변수가 없으면 경고
 */

function getPublicEnv(key: string, fallback = ""): string {
  const value = process.env[key];
  if (!value && typeof window === "undefined") {
    // 서버 빌드 시점에서만 경고 (클라이언트에서는 무시)
    if (process.env.NODE_ENV === "production") {
      console.warn(`[ENV] Missing: ${key}`);
    }
  }
  return value ?? fallback;
}

export const env = {
  SUPABASE_URL: getPublicEnv("NEXT_PUBLIC_SUPABASE_URL"),
  SUPABASE_ANON_KEY: getPublicEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  KAKAO_REST_API_KEY: getPublicEnv("NEXT_PUBLIC_KAKAO_REST_API_KEY"),
  KAKAO_JS_KEY: getPublicEnv("NEXT_PUBLIC_KAKAO_JS_KEY"),
  JITSI_DOMAIN: getPublicEnv("NEXT_PUBLIC_JITSI_DOMAIN", "meet.systemli.org"),
  COMPANY_NAME: getPublicEnv("NEXT_PUBLIC_COMPANY_NAME", "The Polestar"),
} as const;
