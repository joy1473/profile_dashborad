import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// 미들웨어에서 인증 체크를 제거
// Supabase 클라이언트는 localStorage 기반이므로 서버사이드 미들웨어에서 세션을 확인할 수 없음
// 인증은 클라이언트 사이드의 (dashboard)/layout.tsx auth guard에서 처리

const PUBLIC_PATHS = ["/login", "/auth", "/u/", "/api/"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // API, 인증, 공개 경로는 통과
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // 그 외 모든 경로 통과 — 인증은 클라이언트에서 처리
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons/|sw.js|manifest.json|.*\\.png$|.*\\.svg$).*)",
  ],
};
