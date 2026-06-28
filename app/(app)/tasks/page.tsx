import { getSupabaseServer } from "@/lib/supabase/server";
import { TasksClient } from "./TasksClient";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const supabase = getSupabaseServer();
  const [tasksRes, projectsRes, profilesRes] = await Promise.all([
    supabase
      .from("tasks")
      .select(`
        id, title, description, status, priority, due_date, project_id, created_at, sort_order,
        project:projects(id, name, color),
        assignees:task_assignees(id, profile_id, external_email, external_name, profile:profiles(id, full_name, email, avatar_url))
      `)
      .order("due_date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false }),
    supabase.from("projects").select("id, name, color").eq("status", "active").order("name"),
    supabase.from("profiles").select("id, email, full_name, avatar_url").order("full_name"),
  ]);

  return (
    <TasksClient
      initialTasks={(tasksRes.data as any) || []}
      projects={projectsRes.data || []}
      members={profilesRes.data || []}
    />
  );
}
