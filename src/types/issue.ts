export type IssueStatus = "todo" | "in_progress" | "in_review" | "done";
export type IssuePriority = "high" | "medium" | "low";

export interface Issue {
  id: string;
  title: string;
  description: string;
  status: IssueStatus;
  priority: IssuePriority;
  assignee_id: string | null;
  assignee_name: string | null;
  labels: string[];
  due_date: string | null;
  position: number;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface IssueColumn {
  id: IssueStatus;
  title: string;
  issues: Issue[];
}

export interface CreateIssueInput {
  title: string;
  description?: string;
  status?: IssueStatus;
  priority: IssuePriority;
  assignee_id?: string | null;
  assignee_name?: string | null;
  labels?: string[];
  due_date?: string | null;
}

export interface UpdateIssueInput extends Partial<CreateIssueInput> {
  position?: number;
}
