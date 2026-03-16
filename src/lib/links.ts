import { supabase } from "./supabase";
import type { IssueLink } from "@/types/link";

export async function fetchLinks(issueId: string): Promise<IssueLink[]> {
  const { data, error } = await supabase
    .from("issue_links")
    .select("*")
    .eq("issue_id", issueId)
    .order("created_at", { ascending: false });
  if (error) return [];
  return data ?? [];
}

export async function createLink(
  issueId: string,
  url: string,
  label?: string,
): Promise<IssueLink> {
  const { data, error } = await supabase
    .from("issue_links")
    .insert({
      issue_id: issueId,
      url,
      label: label?.trim() || null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteLink(id: string): Promise<void> {
  await supabase.from("issue_links").delete().eq("id", id);
}

export async function fetchLinkCounts(issueIds: string[]): Promise<Map<string, number>> {
  if (issueIds.length === 0) return new Map();
  const { data, error } = await supabase
    .from("issue_links")
    .select("issue_id")
    .in("issue_id", issueIds);
  if (error) return new Map();
  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    counts.set(row.issue_id, (counts.get(row.issue_id) ?? 0) + 1);
  }
  return counts;
}

export function extractDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}
