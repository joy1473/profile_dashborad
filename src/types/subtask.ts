export interface Subtask {
  id: string;
  issue_id: string;
  title: string;
  is_done: boolean;
  assignee_id: string | null;
  assignee_name: string | null;
  position: number;
  created_at: string;
}

export interface MySubtask extends Subtask {
  issue_title: string;
  issue_status: string;
  issue_labels: string[];
}

export interface SubtaskCount {
  issue_id: string;
  total: number;
  done: number;
}

export interface SubtaskActivity {
  id: string;
  subtask_id: string;
  issue_id: string;
  action: "created" | "title_changed" | "assignee_changed" | "completed" | "reopened" | "deleted";
  old_value: string | null;
  new_value: string | null;
  actor_id: string | null;
  actor_name: string | null;
  created_at: string;
}
