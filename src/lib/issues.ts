import { supabase } from "./supabase";
import { mockIssues } from "./mock-issues";
import { logActivity } from "./activities";
import { syncIssueCreate, syncIssueUpdate, syncIssueDelete } from "./neo4j-sync";
import type { Issue, IssueStatus, CreateIssueInput, UpdateIssueInput } from "@/types/issue";

const USE_MOCK = !process.env.NEXT_PUBLIC_SUPABASE_URL;

// ---------- Mock helpers (fallback when Supabase is not configured) ----------

let localIssues = [...mockIssues];
let nextId = 100;

function mockFetch(): Issue[] {
  return localIssues.sort((a, b) => {
    if (a.status !== b.status) return a.status.localeCompare(b.status);
    return a.position - b.position;
  });
}

// ---------- Public API ----------

export async function fetchIssues(): Promise<Issue[]> {
  if (USE_MOCK) return mockFetch();

  const { data, error } = await supabase
    .from("issues")
    .select("*")
    .order("status")
    .order("position");
  if (error) throw error;
  return data;
}

export async function createIssue(input: CreateIssueInput): Promise<Issue> {
  if (USE_MOCK) {
    const now = new Date().toISOString();
    const status = input.status ?? "todo";
    const position = localIssues.filter((i) => i.status === status).length;
    const issue: Issue = {
      id: String(nextId++),
      title: input.title,
      description: input.description ?? "",
      status,
      priority: input.priority,
      assignee_id: input.assignee_id ?? null,
      assignee_name: input.assignee_name ?? null,
      labels: input.labels ?? [],
      due_date: input.due_date ?? null,
      position,
      user_id: "current-user",
      created_at: now,
      updated_at: now,
    };
    localIssues.push(issue);
    return issue;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const status = input.status ?? "todo";
  const { count } = await supabase
    .from("issues")
    .select("*", { count: "exact", head: true })
    .eq("status", status);

  const { data, error } = await supabase
    .from("issues")
    .insert({
      ...input,
      status,
      position: count ?? 0,
      user_id: user.id,
    })
    .select()
    .single();
  if (error) throw error;

  logActivity(user.id, user.user_metadata?.name ?? "Unknown", "이슈 생성", data.title);
  syncIssueCreate(data);

  return data;
}

export async function updateIssue(id: string, input: UpdateIssueInput): Promise<Issue> {
  if (USE_MOCK) {
    const idx = localIssues.findIndex((i) => i.id === id);
    if (idx === -1) throw new Error("Issue not found");
    localIssues[idx] = { ...localIssues[idx], ...input, updated_at: new Date().toISOString() };
    return localIssues[idx];
  }

  const { data, error } = await supabase
    .from("issues")
    .update(input)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;

  logActivity(null, "System", "이슈 수정", data.title);
  syncIssueUpdate(data);

  return data;
}

export async function deleteIssue(id: string): Promise<void> {
  if (USE_MOCK) {
    localIssues = localIssues.filter((i) => i.id !== id);
    return;
  }

  const { error } = await supabase.from("issues").delete().eq("id", id);
  if (error) throw error;

  logActivity(null, "System", "이슈 삭제", id);
  syncIssueDelete(id);
}

export async function moveIssue(id: string, status: IssueStatus, position: number): Promise<Issue> {
  return updateIssue(id, { status, position });
}

export async function reorderIssues(updates: { id: string; position: number }[]): Promise<void> {
  if (USE_MOCK) {
    for (const u of updates) {
      const idx = localIssues.findIndex((i) => i.id === u.id);
      if (idx !== -1) localIssues[idx].position = u.position;
    }
    return;
  }

  // Batch update positions using Promise.all
  await Promise.all(
    updates.map(({ id, position }) =>
      supabase.from("issues").update({ position }).eq("id", id)
    )
  );
}
