export type TaskStatus = "todo" | "in_progress" | "blocked" | "review" | "done";
export type TaskPriority = "low" | "medium" | "high" | "critical";

export interface Profile {
  id: string;
  org_id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: "admin" | "member";
  microsoft_account_email: string | null;
  microsoft_calendar_id: string | null;
}

export interface Project {
  id: string;
  org_id: string;
  name: string;
  description: string | null;
  color: string;
  status: "active" | "archived" | "completed";
  due_date: string | null;
  created_at: string;
}

export interface Task {
  id: string;
  org_id: string;
  project_id: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  completed_at: string | null;
  created_by: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface TaskAssignee {
  id: string;
  task_id: string;
  profile_id: string | null;
  external_email: string | null;
  external_name: string | null;
}

export interface TaskWithRelations extends Task {
  project: Pick<Project, "id" | "name" | "color"> | null;
  assignees: (TaskAssignee & { profile: Pick<Profile, "id" | "email" | "full_name" | "avatar_url"> | null })[];
  comment_count: number;
}

export const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "To do",
  in_progress: "In progress",
  blocked: "Blocked",
  review: "In review",
  done: "Done",
};

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

export const PRIORITY_COLORS: Record<TaskPriority, string> = {
  low: "bg-emerald-100 text-emerald-700 border-emerald-200",
  medium: "bg-amber-100 text-amber-700 border-amber-200",
  high: "bg-orange-100 text-orange-700 border-orange-200",
  critical: "bg-rose-100 text-rose-700 border-rose-200",
};

export const STATUS_COLORS: Record<TaskStatus, string> = {
  todo: "bg-slate-100 text-slate-700 border-slate-200",
  in_progress: "bg-blue-100 text-blue-700 border-blue-200",
  blocked: "bg-rose-100 text-rose-700 border-rose-200",
  review: "bg-violet-100 text-violet-700 border-violet-200",
  done: "bg-emerald-100 text-emerald-700 border-emerald-200",
};
