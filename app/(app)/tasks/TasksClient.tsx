"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { PRIORITY_LABELS, STATUS_LABELS, PRIORITY_COLORS, STATUS_COLORS, TaskPriority, TaskStatus, TaskWithRelations } from "@/lib/types";
import { cn, formatDueDate } from "@/lib/utils";
import { CheckCircle2, ListFilter, Plus, X } from "lucide-react";

const STATUSES: TaskStatus[] = ["todo", "in_progress", "blocked", "review", "done"];
const PRIORITIES: TaskPriority[] = ["low", "medium", "high", "critical"];

type Project = { id: string; name: string; color: string };
type Member = { id: string; email: string; full_name: string | null; avatar_url: string | null };

export function TasksClient({
  initialTasks,
  projects,
  members,
}: {
  initialTasks: TaskWithRelations[];
  projects: Project[];
  members: Member[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tasks, setTasks] = useState<TaskWithRelations[]>(initialTasks);
  const [view, setView] = useState<"list" | "kanban">("list");
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "all">("all");
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [openTask, setOpenTask] = useState<TaskWithRelations | null>(null);
  const [showNew, setShowNew] = useState(false);

  useEffect(() => {
    if (searchParams.get("new") === "1") setShowNew(true);
    const taskId = searchParams.get("task");
    if (taskId) {
      const t = tasks.find((x) => x.id === taskId);
      if (t) setOpenTask(t);
    }
  }, [searchParams, tasks]);

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      if (projectFilter !== "all" && t.project_id !== projectFilter) return false;
      if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [tasks, statusFilter, projectFilter, search]);

  async function refresh() {
    const res = await fetch("/api/tasks");
    if (res.ok) setTasks(await res.json());
  }

  async function updateStatus(taskId: string, status: TaskStatus) {
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status } : t)));
    await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tasks</h1>
          <p className="text-muted-foreground mt-1">{filtered.length} of {tasks.length} tasks</p>
        </div>
        <Button onClick={() => setShowNew(true)}>
          <Plus className="h-4 w-4" /> New task
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Input
          placeholder="Search tasks…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <FilterChip
          label="Status"
          value={statusFilter === "all" ? "All" : STATUS_LABELS[statusFilter]}
          options={["all", ...STATUSES]}
          render={(v) => (v === "all" ? "All" : STATUS_LABELS[v as TaskStatus])}
          onChange={(v) => setStatusFilter(v as any)}
        />
        <FilterChip
          label="Project"
          value={projectFilter === "all" ? "All" : projects.find((p) => p.id === projectFilter)?.name || "All"}
          options={["all", ...projects.map((p) => p.id)]}
          render={(v) => (v === "all" ? "All" : projects.find((p) => p.id === v)?.name || "?")}
          onChange={setProjectFilter}
        />
        <div className="ml-auto flex gap-1 border rounded-lg p-1">
          <button
            onClick={() => setView("list")}
            className={cn("px-3 py-1 text-xs font-medium rounded", view === "list" ? "bg-primary text-primary-foreground" : "")}
          >
            List
          </button>
          <button
            onClick={() => setView("kanban")}
            className={cn("px-3 py-1 text-xs font-medium rounded", view === "kanban" ? "bg-primary text-primary-foreground" : "")}
          >
            Board
          </button>
        </div>
      </div>

      {view === "list" ? (
        <Card className="overflow-hidden">
          {filtered.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground text-sm">
              No tasks match the filters. <button className="text-primary underline" onClick={() => setShowNew(true)}>Create one</button>.
            </div>
          ) : (
            <ul className="divide-y">
              {filtered.map((t) => (
                <TaskRow key={t.id} task={t} onClick={() => setOpenTask(t)} onStatusChange={(s) => updateStatus(t.id, s)} />
              ))}
            </ul>
          )}
        </Card>
      ) : (
        <KanbanBoard tasks={filtered} onTaskClick={setOpenTask} onStatusChange={updateStatus} />
      )}

      <NewTaskDialog
        open={showNew}
        onClose={() => { setShowNew(false); router.replace("/tasks"); }}
        projects={projects}
        members={members}
        onCreated={refresh}
      />
      <TaskDetailDialog
        task={openTask}
        onClose={() => { setOpenTask(null); router.replace("/tasks"); }}
        members={members}
        projects={projects}
        onUpdated={refresh}
      />
    </div>
  );
}

function FilterChip({ label, value, options, render, onChange }: { label: string; value: string; options: string[]; render: (v: string) => string; onChange: (v: string) => void }) {
  return (
    <label className="inline-flex items-center gap-2 text-xs">
      <span className="text-muted-foreground">{label}:</span>
      <select
        value={options.find((o) => render(o) === value) || options[0]}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 rounded-md border bg-background px-2 text-xs"
      >
        {options.map((o) => (
          <option key={o} value={o}>{render(o)}</option>
        ))}
      </select>
    </label>
  );
}

function TaskRow({ task, onClick, onStatusChange }: { task: TaskWithRelations; onClick: () => void; onStatusChange: (s: TaskStatus) => void }) {
  const due = formatDueDate(task.due_date);
  return (
    <li className="px-4 py-3 hover:bg-accent/30 transition-colors flex items-center gap-3">
      <button
        onClick={(e) => { e.stopPropagation(); onStatusChange(task.status === "done" ? "todo" : "done"); }}
        className={cn(
          "h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0",
          task.status === "done" ? "bg-emerald-500 border-emerald-500" : "border-muted-foreground/40 hover:border-primary"
        )}
      >
        {task.status === "done" && <CheckCircle2 className="h-3 w-3 text-white" />}
      </button>
      <button onClick={onClick} className="flex-1 text-left min-w-0">
        <div className={cn("text-sm font-medium truncate", task.status === "done" && "line-through text-muted-foreground")}>{task.title}</div>
        <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5 flex-wrap">
          {task.project && (
            <span className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-full" style={{ background: task.project.color }} />
              {task.project.name}
            </span>
          )}
          <Badge className={cn(PRIORITY_COLORS[task.priority], "text-[10px] py-0")}>{PRIORITY_LABELS[task.priority]}</Badge>
          {task.status !== "done" && task.status !== "todo" && (
            <Badge className={cn(STATUS_COLORS[task.status], "text-[10px] py-0")}>{STATUS_LABELS[task.status]}</Badge>
          )}
        </div>
      </button>
      <div className="flex items-center gap-3 shrink-0">
        <div className="flex -space-x-2">
          {(task.assignees || []).slice(0, 3).map((a, i) => (
            <Avatar
              key={i}
              size={24}
              name={a.profile?.full_name || a.external_name || a.external_email}
              email={a.profile?.email || a.external_email || undefined}
              src={a.profile?.avatar_url}
              className="ring-2 ring-card"
            />
          ))}
        </div>
        <span className={cn(
          "text-xs font-medium whitespace-nowrap min-w-[100px] text-right",
          due.tone === "overdue" && "text-rose-600",
          due.tone === "today" && "text-orange-600",
          due.tone === "soon" && "text-amber-600",
          due.tone === "future" && "text-muted-foreground",
          due.tone === "none" && "text-muted-foreground/60",
        )}>{due.label}</span>
      </div>
    </li>
  );
}

function KanbanBoard({ tasks, onTaskClick, onStatusChange }: { tasks: TaskWithRelations[]; onTaskClick: (t: TaskWithRelations) => void; onStatusChange: (id: string, s: TaskStatus) => void }) {
  const byStatus: Record<TaskStatus, TaskWithRelations[]> = { todo: [], in_progress: [], blocked: [], review: [], done: [] };
  for (const t of tasks) byStatus[t.status].push(t);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {STATUSES.map((s) => (
        <div key={s} className="bg-muted/50 rounded-xl p-3">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">{STATUS_LABELS[s]}</h3>
            <span className="text-xs text-muted-foreground">{byStatus[s].length}</span>
          </div>
          <div className="space-y-2">
            {byStatus[s].map((t) => {
              const due = formatDueDate(t.due_date);
              return (
                <button
                  key={t.id}
                  onClick={() => onTaskClick(t)}
                  className="w-full bg-card border rounded-lg p-3 text-left hover:shadow-sm transition-shadow"
                >
                  <div className="text-sm font-medium line-clamp-2">{t.title}</div>
                  <div className="flex items-center justify-between mt-2 gap-2">
                    <Badge className={cn(PRIORITY_COLORS[t.priority], "text-[10px] py-0")}>{t.priority}</Badge>
                    <span className={cn(
                      "text-[10px] font-medium",
                      due.tone === "overdue" && "text-rose-600",
                      due.tone === "today" && "text-orange-600",
                      due.tone === "soon" && "text-amber-600",
                      due.tone === "future" && "text-muted-foreground",
                    )}>{due.label}</span>
                  </div>
                  {(t.assignees || []).length > 0 && (
                    <div className="flex -space-x-1 mt-2">
                      {(t.assignees || []).slice(0, 3).map((a, i) => (
                        <Avatar
                          key={i}
                          size={20}
                          name={a.profile?.full_name || a.external_name || a.external_email}
                          email={a.profile?.email || a.external_email || undefined}
                          src={a.profile?.avatar_url}
                          className="ring-2 ring-card"
                        />
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
            {byStatus[s].length === 0 && (
              <div className="text-xs text-muted-foreground/60 text-center py-4">No tasks</div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function NewTaskDialog({ open, onClose, projects, members, onCreated }: {
  open: boolean;
  onClose: () => void;
  projects: Project[];
  members: Member[];
  onCreated: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState<string>("");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [dueDate, setDueDate] = useState("");
  const [assignees, setAssignees] = useState<string[]>([]);
  const [externalEmail, setExternalEmail] = useState("");
  const [externals, setExternals] = useState<{ email: string; name?: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setTitle(""); setDescription(""); setProjectId(""); setPriority("medium");
    setDueDate(""); setAssignees([]); setExternalEmail(""); setExternals([]);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSubmitting(true);
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title, description, project_id: projectId || null, priority,
        due_date: dueDate ? new Date(dueDate).toISOString() : null,
        assignee_profile_ids: assignees,
        external_assignees: externals,
      }),
    });
    setSubmitting(false);
    if (res.ok) { reset(); onClose(); onCreated(); }
  }

  function addExternal() {
    if (!externalEmail.trim() || !/\S+@\S+\.\S+/.test(externalEmail)) return;
    setExternals((s) => [...s, { email: externalEmail.trim() }]);
    setExternalEmail("");
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New task</DialogTitle>
          <DialogDescription>Add a task with assignees, deadline, and project.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-sm font-medium">Title</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What needs to be done?" autoFocus required className="mt-1" />
          </div>
          <div>
            <label className="text-sm font-medium">Description (optional)</label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Add detail, links, acceptance criteria…" className="mt-1" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Due date</label>
              <Input type="datetime-local" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">Priority</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)} className="mt-1 h-10 w-full rounded-lg border bg-background px-3 text-sm">
                {PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Project (optional)</label>
            <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="mt-1 h-10 w-full rounded-lg border bg-background px-3 text-sm">
              <option value="">—</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">Assign to team members</label>
            <div className="mt-1 grid grid-cols-2 gap-1 max-h-32 overflow-y-auto border rounded-lg p-2">
              {members.map((m) => {
                const checked = assignees.includes(m.id);
                return (
                  <label key={m.id} className="flex items-center gap-2 text-sm px-1 py-1 rounded hover:bg-accent cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => setAssignees((s) => checked ? s.filter((x) => x !== m.id) : [...s, m.id])}
                    />
                    <Avatar size={20} name={m.full_name} email={m.email} src={m.avatar_url} />
                    <span className="truncate">{m.full_name || m.email}</span>
                  </label>
                );
              })}
              {members.length === 0 && <div className="text-xs text-muted-foreground p-2">No team members yet. Invite them on the Team page.</div>}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">External assignees (email reminders only)</label>
            <div className="mt-1 flex gap-2">
              <Input type="email" value={externalEmail} onChange={(e) => setExternalEmail(e.target.value)} placeholder="person@example.com" />
              <Button type="button" variant="outline" onClick={addExternal}>Add</Button>
            </div>
            {externals.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {externals.map((e, i) => (
                  <Badge key={i} className="bg-slate-100 border-slate-200 gap-1">
                    {e.email}
                    <button type="button" onClick={() => setExternals((s) => s.filter((_, j) => j !== i))}>
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={submitting || !title.trim()}>{submitting ? "Creating…" : "Create task"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function TaskDetailDialog({ task, onClose, members, projects, onUpdated }: {
  task: TaskWithRelations | null;
  onClose: () => void;
  members: Member[];
  projects: Project[];
  onUpdated: () => void;
}) {
  const [comment, setComment] = useState("");
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!task) return;
    fetch(`/api/tasks/${task.id}/comments`).then(async (r) => {
      if (r.ok) setComments(await r.json());
    });
  }, [task?.id]);

  if (!task) return null;
  const due = formatDueDate(task.due_date);

  async function updateField(patch: Partial<TaskWithRelations>) {
    setLoading(true);
    await fetch(`/api/tasks/${task!.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    setLoading(false);
    onUpdated();
  }

  async function submitComment(e: React.FormEvent) {
    e.preventDefault();
    if (!comment.trim()) return;
    const res = await fetch(`/api/tasks/${task!.id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: comment }),
    });
    if (res.ok) {
      const newC = await res.json();
      setComments((s) => [...s, newC]);
      setComment("");
    }
  }

  async function deleteTask() {
    if (!confirm("Delete this task?")) return;
    await fetch(`/api/tasks/${task!.id}`, { method: "DELETE" });
    onClose(); onUpdated();
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <div className="flex items-start gap-2">
            <Input
              defaultValue={task.title}
              onBlur={(e) => e.target.value !== task.title && updateField({ title: e.target.value })}
              className="text-lg font-semibold border-none px-0 focus-visible:ring-0 h-auto"
            />
          </div>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-2 text-xs">
          <Field label="Status">
            <select
              defaultValue={task.status}
              onChange={(e) => updateField({ status: e.target.value as TaskStatus })}
              className="w-full h-9 rounded-md border bg-background px-2 text-xs"
            >
              {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
            </select>
          </Field>
          <Field label="Priority">
            <select
              defaultValue={task.priority}
              onChange={(e) => updateField({ priority: e.target.value as TaskPriority })}
              className="w-full h-9 rounded-md border bg-background px-2 text-xs"
            >
              {PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>)}
            </select>
          </Field>
          <Field label="Due">
            <Input
              type="datetime-local"
              defaultValue={task.due_date ? task.due_date.slice(0, 16) : ""}
              onBlur={(e) => updateField({ due_date: e.target.value ? new Date(e.target.value).toISOString() : null })}
              className="h-9 text-xs"
            />
          </Field>
          <Field label="Project">
            <select
              defaultValue={task.project_id || ""}
              onChange={(e) => updateField({ project_id: e.target.value || null })}
              className="w-full h-9 rounded-md border bg-background px-2 text-xs col-span-3"
            >
              <option value="">—</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground">Description</label>
          <Textarea
            defaultValue={task.description || ""}
            onBlur={(e) => e.target.value !== (task.description || "") && updateField({ description: e.target.value })}
            placeholder="Add detail…"
            className="mt-1"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground">Assignees</label>
          <div className="mt-1 flex flex-wrap gap-2">
            {(task.assignees || []).map((a, i) => (
              <Badge key={i} className="bg-slate-100 border-slate-200 gap-1">
                <Avatar size={16} name={a.profile?.full_name || a.external_name || a.external_email} email={a.profile?.email || a.external_email || undefined} src={a.profile?.avatar_url} />
                {a.profile?.full_name || a.profile?.email || a.external_email}
              </Badge>
            ))}
            {task.assignees.length === 0 && <span className="text-xs text-muted-foreground">No one assigned</span>}
          </div>
        </div>

        <div className="border-t pt-4">
          <label className="text-sm font-medium">Comments</label>
          <ul className="mt-2 space-y-3 max-h-48 overflow-y-auto">
            {comments.map((c) => (
              <li key={c.id} className="flex gap-2">
                <Avatar size={28} name={c.author?.full_name} email={c.author?.email} src={c.author?.avatar_url} />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium">{c.author?.full_name || c.author?.email || "Unknown"}</div>
                  <div className="text-sm whitespace-pre-wrap">{c.body}</div>
                </div>
              </li>
            ))}
            {comments.length === 0 && <li className="text-xs text-muted-foreground">No comments yet.</li>}
          </ul>
          <form onSubmit={submitComment} className="mt-3 flex gap-2">
            <Input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Add a comment…" />
            <Button type="submit" disabled={!comment.trim()}>Post</Button>
          </form>
        </div>

        <div className="flex justify-between pt-2 border-t">
          <Button variant="ghost" onClick={deleteTask} className="text-rose-600 hover:text-rose-700">Delete task</Button>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      {children}
    </div>
  );
}
