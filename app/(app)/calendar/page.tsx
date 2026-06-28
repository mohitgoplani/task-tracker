import { getSupabaseServer } from "@/lib/supabase/server";
import { CalendarClient } from "./CalendarClient";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const supabase = getSupabaseServer();
  const start = new Date();
  start.setDate(1);
  const end = new Date(start);
  end.setMonth(end.getMonth() + 2);

  const { data } = await supabase
    .from("tasks")
    .select("id, title, due_date, status, priority, project:projects(name, color)")
    .not("due_date", "is", null)
    .gte("due_date", start.toISOString())
    .lt("due_date", end.toISOString())
    .order("due_date", { ascending: true });

  return <CalendarClient tasks={(data as any) || []} />;
}
