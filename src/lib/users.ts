import { supabase } from "./supabase";
import { users as mockUsers } from "./mock-data";
import type { User, UpdateProfileInput } from "@/types";

const USE_MOCK = !process.env.NEXT_PUBLIC_SUPABASE_URL;

export async function fetchProfiles(): Promise<User[]> {
  if (USE_MOCK) return mockUsers;

  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) return mockUsers;

    return (data ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      email: p.email ?? "",
      role: p.role as User["role"],
      teamRole: (p.team_role ?? "") as User["teamRole"],
      status: p.status as User["status"],
      joinedAt: p.created_at?.split("T")[0] ?? "",
      avatar: p.avatar_url ?? undefined,
    }));
  } catch {
    return mockUsers;
  }
}

export async function updateProfile(
  userId: string,
  input: UpdateProfileInput
): Promise<User> {
  const res = await fetch("/api/users", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, ...input }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error ?? "프로필 수정에 실패했습니다");
  }

  const p = await res.json();
  return {
    id: p.id,
    name: p.name,
    email: p.email ?? "",
    role: p.role as User["role"],
    teamRole: (p.team_role ?? "") as User["teamRole"],
    status: p.status as User["status"],
    joinedAt: p.created_at?.split("T")[0] ?? "",
    avatar: p.avatar_url ?? undefined,
  };
}
