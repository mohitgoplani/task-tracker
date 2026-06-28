import Link from "next/link";
import { getSupabaseServer } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { formatDueDate, cn } from "@/lib/utils";
import { PRIORITY_COLORS, STATUS_COLORS, STATUS_LABELS } from "@/lib/types";
import { ArrowRight, AlertTriangle, CheckCircle2, Clock, ListTodo } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  // Stats: open count, due-this-week count, overdue count, done-this-week count
  const now = new Date().toISOString();
  const weekEnd = new Date(Date.now() + 7 * 86400000).toISOString();
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();

  const [openRes, dueRes, overdueRes, doneRes, upcomingRes, myRes] = await Promise.all([
    supabase.from("tasks").select("id", { count: "exact", head: true }).neq("status", "done"),
    supabase.from("tasks").select("id", { count: "exact", head: true }).gte("due_date", now).lte("due_date", weekEnd).neq("status", "done"),
    supabase.from("tasks").select("id", { count: "exact", head: true }).lt("due_date", now).neq("status", "done"),
    supabase.from("tasks").select("id", { count: "exact", head: true }).eq("status", "done").gte("updated_at", weekAgo),
    supabase
      .from("tasks")
      .select("id, title, status, priority, due_date, project:projects(id, name, color), assignees:task_assignees(profile:profiles(id, full_name, email, avatar_url), external_email, external_name)")
      .neq("status", "done")
      .not("due_date", "is", null)
      .order("due_date", { ascending: true })
      .limit(10),
    supabase
      .from("task_assignees")
      .select("task:tasks(id, title, status, priority, due_date)")
      .eq("profile_id", user!.id)
      .limit(20),
  ]);

  const myOpenTasks = (myRes.data || [])
    .map((r) => (r as any).task)
    .filter((t) => t && t.status !== "done")
    .slice(0, 6);

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">What needs your attention this week</p>
        </div>
        <Button asChild>
          <Link href="/tasks?new=1">+ New task</Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={ListTodo} label="Open tasks" value={openRes.count ?? 0} tone="default" />
        <StatCard icon={Clock} label="Due this week" value={dueRes.count ?? 0} tone="amber" />
        <StatCard icon={AlertTriangle} label="Overdue" value={overdueRes.count ?? 0} tone="rose" />
        <StatCard icon={CheckCircle2} label="Done this week" value={doneRes.count ?? 0} tone="emerald" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Upcoming deadlines</h2>
            <Link href="/tasks" className="text-sm text-primary hover:underline flex items-center gap-1">
              All tasks <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {(!upcomingRes.data || upcomingRes.data.length === 0) ? (
            <div className="text-sm text-muted-foreground py-8 text-center">No upcoming deadlines.</div>
          ) : (
            <ul className="divide-y">
              {(upcomingRes.data as any[]).map((t) => {
                const due = formatDueDate(t.due_date);
                return (
                  <li key={t.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <Link href={`/tasks?task=${t.id}`} className="font-medium text-sm hover:underline truncate block">
                        {t.title}
                      </Link>
                      <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
                        {t.project && (
                          <span className="inline-flex items-center gap-1">
                            <span className="h-2 w-2 rounded-full" style={{ background: t.project.color }} />
                            {t.project.name}
                          </span>
                        )}
                        <Badge className={cn(PRIORITY_COLORS[t.priority as keyof typeof PRIORITY_COLORS], "text-[10px] py-0")}>{t.priority}</Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex -space-x-2">
                        {(t.assignees || []).slice(0, 3).map((a: any, i: number) => (
                          <Avatar
                            key={i}
                            size={24}
                            name={a.profile?.full_name || a.external_name}
                            email={a.profile?.email || a.external_email}
                            src={a.profile?.avatar_url}
                            className="ring-2 ring-card"
                          />
                        ))}
                      </div>
                      <span className={cn(
                        "text-xs font-medium whitespace-nowrap",
                        due.tone === "overdue" && "text-rose-600",
                        due.tone === "today" && "text-orange-600",
                        due.tone === "soon" && "text-amber-600",
                        due.tone === "future" && "text-muted-foreground",
                      )}>{due.label}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Assigned to me</h2>
          {myOpenTasks.length === 0 ? (
            <div className="text-sm text-muted-foreground py-6 text-center">Nothing assigned yet.</div>
          ) : (
            <ul className="space-y-3">
              {myOpenTasks.map((t: any) => {
                const due = formatDueDate(t.due_date);
                return (
                  <li key={t.id}>
                    <Link href={`/tasks?task=${t.id}`} className="block group">
                      <div className="font-medium text-sm group-hover:underline">{t.title}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
                        <Badge className={cn(STATUS_COLORS[t.status as keyof typeof STATUS_COLORS], "text-[10px] py-0")}>
                          {STATUS_LABELS[t.status as keyof typeof STATUS_LABELS]}
                        </Badge>
                        <span>{due.label}</span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, tone }: { icon: any; label: string; value: number; tone: "default" | "amber" | "rose" | "emerald" }) {
  const tones: Record<string, string> = {
    default: "bg-slate-100 text-slate-700",
    amber: "bg-amber-100 text-amber-700",
    rose: "bg-rose-100 text-rose-700",
    emerald: "bg-emerald-100 text-emerald-700",
  };
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center", tones[tone])}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="text-3xl font-bold tracking-tight">{value}</div>
    </Card>
  );
}
