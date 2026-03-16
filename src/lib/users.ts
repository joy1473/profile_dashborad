import { supabase } from "./supabase";
import { users as mockUsers } from "./mock-data";
import type { User } from "@/types";

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
      status: p.status as User["status"],
      joinedAt: p.created_at?.split("T")[0] ?? "",
      avatar: p.avatar_url ?? undefined,
    }));
  } catch {
    return mockUsers;
  }
}
