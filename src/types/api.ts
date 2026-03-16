import type { Session, User } from "@supabase/supabase-js";

/**
 * Auth context injected into authenticated API handlers.
 * session and user are guaranteed non-null.
 */
export interface AuthContext {
  session: Session;
  user: User;
}

/**
 * Auth context for optional auth routes.
 * session and user may be null.
 */
export interface OptionalAuthContext {
  session: Session | null;
  user: User | null;
}

/**
 * Handler function type for routes that require authentication.
 */
export type AuthenticatedHandler = (
  request: Request,
  context: AuthContext
) => Promise<Response>;

/**
 * Handler function type for routes with optional authentication.
 */
export type OptionalAuthHandler = (
  request: Request,
  context: OptionalAuthContext
) => Promise<Response>;
