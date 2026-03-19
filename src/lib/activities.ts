import { supabase } from "./supabase";
import { activities as mockActivities } from "./mock-data";
import { formatRelativeTime } from "./utils";
import type { Activity } from "@/types";

const USE_MOCK = !process.env.NEXT_PUBLIC_SUPABASE_URL;

export async function fetchActivities(limit = 10): Promise<Activity[]> {
  if (USE_MOCK) return mockActivities.slice(0, limit);

  try {
    const { data, error } = await supabase
      .from("activities")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) return mockActivities.slice(0, limit);

    return (data ?? []).map((a) => ({
      id: a.id,
      user: a.user_name,
      action: a.action,
      target: a.target,
      timestamp: formatRelativeTime(a.created_at),
    }));
  } catch {
    return mockActivities.slice(0, limit);
  }
}

export async function logActivity(
  userId: string | null,
  userName: string,
  action: string,
  target: string,
): Promise<void> {
  if (USE_MOCK) return;

  await supabase.from("activities").insert({
    user_id: userId,
    user_name: userName,
    action,
    target,
  });
}

