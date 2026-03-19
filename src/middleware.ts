import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

const PROTECTED_PATHS = [
  "/dashboard",
  "/analytics",
  "/users",
  "/board",
  "/graph",
  "/qr-cards",
  "/settings",
];

const PUBLIC_PATHS = ["/login", "/auth", "/u/", "/api/auth-log"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public paths → allow
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Only protect dashboard routes
  if (!PROTECTED_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // If Supabase not configured, allow (dev mode)
  if (!url || !key) {
    return NextResponse.next();
  }

  // Check for auth token in cookies
  const accessToken = request.cookies.get("sb-access-token")?.value
    ?? request.cookies.get(`sb-${new URL(url).hostname.split(".")[0]}-auth-token`)?.value;

  if (!accessToken) {
    // No token found, try checking via Supabase
    const supabase = createClient(url, key, {
      global: {
        headers: { cookie: request.headers.get("cookie") ?? "" },
      },
    });

    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons/|sw.js|manifest.json|.*\\.png$|.*\\.svg$).*)",
  ],
};
