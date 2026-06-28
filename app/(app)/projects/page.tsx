import { getSupabaseServer } from "@/lib/supabase/server";
import { ProjectsClient } from "./ProjectsClient";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const supabase = getSupabaseServer();
  const [projectsRes, tasksRes] = await Promise.all([
    supabase.from("projects").select("id, name, description, color, status, due_date, created_at").order("created_at", { ascending: false }),
    supabase.from("tasks").select("id, project_id, status").not("project_id", "is", null),
  ]);

  const projects = (projectsRes.data || []).map((p) => {
    const tasks = (tasksRes.data || []).filter((t) => t.project_id === p.id);
    const done = tasks.filter((t) => t.status === "done").length;
    return { ...p, totalTasks: tasks.length, doneTasks: done };
  });

  return <ProjectsClient initialProjects={projects} />;
}
