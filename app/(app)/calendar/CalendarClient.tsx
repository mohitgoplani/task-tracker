"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, startOfMonth, startOfWeek } from "date-fns";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type CalTask = { id: string; title: string; due_date: string; status: string; priority: string; project: { name: string; color: string } | null };

export function CalendarClient({ tasks }: { tasks: CalTask[] }) {
  const [cursor, setCursor] = useState(new Date());

  const days = useMemo(() => {
    const monthStart = startOfMonth(cursor);
    const monthEnd = endOfMonth(cursor);
    return eachDayOfInterval({ start: startOfWeek(monthStart), end: endOfWeek(monthEnd) });
  }, [cursor]);

  const tasksByDay = useMemo(() => {
    const m = new Map<string, CalTask[]>();
    for (const t of tasks) {
      const key = format(new Date(t.due_date), "yyyy-MM-dd");
      const arr = m.get(key) || [];
      arr.push(t);
      m.set(key, arr);
    }
    return m;
  }, [tasks]);

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Calendar</h1>
          <p className="text-muted-foreground mt-1">{tasks.length} tasks with deadlines this month</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setCursor(addMonths(cursor, -1))}><ChevronLeft className="h-4 w-4" /></Button>
          <div className="font-semibold w-40 text-center">{format(cursor, "MMMM yyyy")}</div>
          <Button variant="outline" size="sm" onClick={() => setCursor(addMonths(cursor, 1))}><ChevronRight className="h-4 w-4" /></Button>
          <Button variant="outline" size="sm" onClick={() => setCursor(new Date())}>Today</Button>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="grid grid-cols-7 border-b bg-muted/50">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} className="px-3 py-2 text-xs font-semibold text-muted-foreground text-center">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((day) => {
            const key = format(day, "yyyy-MM-dd");
            const dayTasks = tasksByDay.get(key) || [];
            const isToday = isSameDay(day, new Date());
            const inMonth = isSameMonth(day, cursor);
            return (
              <div
                key={key}
                className={cn(
                  "min-h-[110px] border-b border-r p-2 text-xs",
                  !inMonth && "bg-muted/20 text-muted-foreground/50",
                  isToday && "bg-primary/5"
                )}
              >
                <div className={cn("font-medium mb-1", isToday && "text-primary")}>{format(day, "d")}</div>
                <div className="space-y-1">
                  {dayTasks.slice(0, 3).map((t) => (
                    <Link
                      key={t.id}
                      href={`/tasks?task=${t.id}`}
                      className={cn(
                        "block px-1.5 py-0.5 rounded text-[10px] font-medium truncate",
                        t.status === "done" ? "bg-emerald-100 text-emerald-700 line-through" : "bg-card border hover:bg-accent"
                      )}
                      title={t.title}
                    >
                      {t.project && <span className="inline-block h-1.5 w-1.5 rounded-full mr-1 align-middle" style={{ background: t.project.color }} />}
                      {t.title}
                    </Link>
                  ))}
                  {dayTasks.length > 3 && <div className="text-[10px] text-muted-foreground">+{dayTasks.length - 3} more</div>}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
