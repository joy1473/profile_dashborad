import { supabase } from "./supabase";
import type { Session, User } from "@supabase/supabase-js";

export async function getSession(): Promise<Session | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

export function onAuthStateChange(callback: (session: Session | null) => void) {
  return supabase.auth.onAuthStateChange((_event, session) => {
    callback(session);
  });
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
  window.location.href = '/login';
}

export function getDisplayName(user: User): string {
  return user.user_metadata?.full_name ?? user.email ?? "사용자";
}

export function getAvatarUrl(user: User): string | null {
  return user.user_metadata?.avatar_url ?? null;
}
