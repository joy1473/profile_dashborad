import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type {
  AuthenticatedHandler,
  OptionalAuthHandler,
  AuthContext,
} from "@/types/api";

/**
 * Create a Supabase client from request cookies (server-side).
 * Returns null if Supabase env vars are not configured.
 */
function createServerSupabase(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) return null;

  return createClient(url, key, {
    global: {
      headers: { cookie: request.headers.get("cookie") ?? "" },
    },
  });
}

/**
 * Higher-order function that wraps an API route handler with auth.
 * Returns 401 if no valid session exists.
 *
 * Usage:
 *   export const GET = withAuth(async (request, { session, user }) => {
 *     return NextResponse.json({ userId: user.id });
 *   });
 */
export function withAuth(handler: AuthenticatedHandler) {
  return async (request: Request): Promise<Response> => {
    const supabase = createServerSupabase(request);

    if (!supabase) {
      return NextResponse.json(
        { error: "Server not configured" },
        { status: 503 }
      );
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return handler(request, { session, user: session.user });
  };
}

/**
 * Higher-order function for routes with optional authentication.
 * Does not return 401 — passes null session/user if unauthenticated.
 *
 * Usage:
 *   export const GET = withOptionalAuth(async (request, { session, user }) => {
 *     const isLoggedIn = !!session;
 *     return NextResponse.json({ public: true, isLoggedIn });
 *   });
 */
export function withOptionalAuth(handler: OptionalAuthHandler) {
  return async (request: Request): Promise<Response> => {
    const supabase = createServerSupabase(request);

    if (!supabase) {
      return handler(request, { session: null, user: null });
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    return handler(request, {
      session,
      user: session?.user ?? null,
    });
  };
}
