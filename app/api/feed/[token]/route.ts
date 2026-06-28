import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { buildIcsFeed } from "@/lib/ics";

// Public read-only calendar feed for one user, identified by a secret token.
// Used as an "Internet Calendar" subscription in Outlook / Google Calendar / Apple Calendar.
export async function GET(_req: NextRequest, { params }: { params: { token: string } }) {
  const admin = getSupabaseAdmin();

  const { data: profile } = await admin
    .from("profiles")
    .select("id, email, full_name")
    .eq("calendar_token", params.token)
    .maybeSingle();

  if (!profile) return new NextResponse("Not found", { status: 404 });

  // Find all tasks assigned to this user (internal assignee), within ±90 days of today
  const ninetyDaysAgo = new Date(Date.now() - 90 * 86400000).toISOString();
  const ninetyDaysAhead = new Date(Date.now() + 365 * 86400000).toISOString();

  const { data: assigneeRows } = await admin
    .from("task_assignees")
    .select("task:tasks(id, title, description, due_date, status, priority, project:projects(name))")
    .eq("profile_id", profile.id);

  const tasks = (assigneeRows || [])
    .map((r: any) => r.task)
    .filter((t: any) =>
      t && t.due_date && t.due_date >= ninetyDaysAgo && t.due_date <= ninetyDaysAhead
    )
    .map((t: any) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      due_date: t.due_date,
      status: t.status,
      priority: t.priority,
      project_name: t.project?.name ?? null,
    }));

  const ics = buildIcsFeed({
    userEmail: profile.email,
    fullName: profile.full_name,
    tasks,
    appUrl: process.env.NEXT_PUBLIC_APP_URL || "",
  });

  return new NextResponse(ics, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Cache-Control": "public, max-age=300", // 5 min cache
      "Content-Disposition": `inline; filename="task-tracker.ics"`,
    },
  });
}
