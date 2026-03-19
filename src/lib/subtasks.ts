import { supabase } from "./supabase";
import type { Subtask, MySubtask, SubtaskCount, SubtaskActivity } from "@/types/subtask";

async function getActor(): Promise<{ id: string | null; name: string | null }> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { id: null, name: null };
  const { data: profile } = await supabase
    .from("profiles")
    .select("name")
    .eq("id", data.user.id)
    .single();
  return { id: data.user.id, name: profile?.name ?? null };
}

async function logActivity(
  subtaskId: string,
  issueId: string,
  action: SubtaskActivity["action"],
  oldValue?: string | null,
  newValue?: string | null,
) {
  const actor = await getActor();
  await supabase.from("subtask_activities").insert({
    subtask_id: subtaskId,
    issue_id: issueId,
    action,
    old_value: oldValue ?? null,
    new_value: newValue ?? null,
    actor_id: actor.id,
    actor_name: actor.name,
  });
}

export async function fetchSubtasks(issueId: string): Promise<Subtask[]> {
  const { data, error } = await supabase
    .from("issue_subtasks")
    .select("*")
    .eq("issue_id", issueId)
    .order("position");
  if (error) return [];
  return data ?? [];
}

export async function createSubtask(
  issueId: string,
  title: string,
  assigneeId?: string | null,
  assigneeName?: string | null,
): Promise<Subtask> {
  const { count } = await supabase
    .from("issue_subtasks")
    .select("*", { count: "exact", head: true })
    .eq("issue_id", issueId);

  const { data, error } = await supabase
    .from("issue_subtasks")
    .insert({
      issue_id: issueId,
      title,
      assignee_id: assigneeId ?? null,
      assignee_name: assigneeName ?? null,
      position: count ?? 0,
    })
    .select()
    .single();

  if (error) throw error;
  await logActivity(data.id, issueId, "created", null, title);
  return data;
}

export async function updateSubtaskTitle(id: string, issueId: string, oldTitle: string, newTitle: string): Promise<Subtask> {
  const { data, error } = await supabase
    .from("issue_subtasks")
    .update({ title: newTitle })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  await logActivity(id, issueId, "title_changed", oldTitle, newTitle);
  return data;
}

export async function updateSubtaskAssignee(
  id: string,
  issueId: string,
  oldAssigneeName: string | null,
  newAssigneeId: string | null,
  newAssigneeName: string | null,
): Promise<Subtask> {
  const { data, error } = await supabase
    .from("issue_subtasks")
    .update({ assignee_id: newAssigneeId, assignee_name: newAssigneeName })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  await logActivity(id, issueId, "assignee_changed", oldAssigneeName ?? "미배정", newAssigneeName ?? "미배정");
  return data;
}

export async function toggleSubtask(id: string, isDone: boolean, issueId?: string): Promise<Subtask> {
  const { data, error } = await supabase
    .from("issue_subtasks")
    .update({ is_done: isDone })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  if (issueId) {
    await logActivity(id, issueId, isDone ? "completed" : "reopened");
  }
  return data;
}

export async function deleteSubtask(id: string, issueId?: string, title?: string): Promise<void> {
  if (issueId) {
    await logActivity(id, issueId, "deleted", title ?? null, null);
  }
  await supabase.from("issue_subtasks").delete().eq("id", id);
}

export async function fetchSubtaskActivities(issueId: string): Promise<SubtaskActivity[]> {
  const { data, error } = await supabase
    .from("subtask_activities")
    .select("*")
    .eq("issue_id", issueId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) return [];
  return data ?? [];
}

export async function fetchMySubtasks(userId: string): Promise<MySubtask[]> {
  const { data, error } = await supabase
    .from("issue_subtasks")
    .select("*, issues!inner(title, status, labels)")
    .eq("assignee_id", userId)
    .order("is_done")
    .order("created_at", { ascending: false });

  if (error) return [];
  return (data ?? []).map((row) => {
    const issue = row.issues as { title: string; status: string; labels: string[] } | null;
    return {
      ...row,
      issue_title: issue?.title ?? "",
      issue_status: issue?.status ?? "todo",
      issue_labels: issue?.labels ?? [],
    };
  });
}

export async function fetchSubtaskCounts(issueIds: string[]): Promise<Map<string, SubtaskCount>> {
  if (issueIds.length === 0) return new Map();

  const { data, error } = await supabase
    .from("issue_subtasks")
    .select("issue_id, is_done")
    .in("issue_id", issueIds);

  if (error) return new Map();

  const counts = new Map<string, SubtaskCount>();
  for (const row of data ?? []) {
    const existing = counts.get(row.issue_id) ?? { issue_id: row.issue_id, total: 0, done: 0 };
    existing.total++;
    if (row.is_done) existing.done++;
    counts.set(row.issue_id, existing);
  }
  return counts;
}
