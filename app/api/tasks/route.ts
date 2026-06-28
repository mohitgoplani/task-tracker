import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getSupabaseServer } from "@/lib/supabase/server";

const CreateTaskSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().optional().nullable(),
  project_id: z.string().uuid().optional().nullable(),
  priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  status: z.enum(["todo", "in_progress", "blocked", "review", "done"]).default("todo"),
  due_date: z.string().datetime().optional().nullable(),
  assignee_profile_ids: z.array(z.string().uuid()).default([]),
  external_assignees: z.array(z.object({ email: z.string().email(), name: z.string().optional() })).default([]),
});

export async function GET() {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("tasks")
    .select(`
      id, title, description, status, priority, due_date, project_id, created_at, sort_order,
      project:projects(id, name, color),
      assignees:task_assignees(id, profile_id, external_email, external_name, profile:profiles(id, full_name, email, avatar_url))
    `)
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const supabase = getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("org_id").eq("id", user.id).single();
  if (!profile) return NextResponse.json({ error: "no_profile" }, { status: 400 });

  const body = CreateTaskSchema.parse(await req.json());

  const { data: task, error } = await supabase
    .from("tasks")
    .insert({
      org_id: profile.org_id,
      title: body.title,
      description: body.description ?? null,
      project_id: body.project_id ?? null,
      priority: body.priority,
      status: body.status,
      due_date: body.due_date ?? null,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error || !task) return NextResponse.json({ error: error?.message || "insert_failed" }, { status: 500 });

  const inserts: any[] = [];
  for (const pid of body.assignee_profile_ids) inserts.push({ task_id: task.id, profile_id: pid });
  for (const ext of body.external_assignees) inserts.push({ task_id: task.id, external_email: ext.email, external_name: ext.name ?? null });
  if (inserts.length) await supabase.from("task_assignees").insert(inserts);

  return NextResponse.json({ id: task.id });
}
