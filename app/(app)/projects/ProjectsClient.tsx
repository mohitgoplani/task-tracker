"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Folder, Plus } from "lucide-react";
import { formatDueDate } from "@/lib/utils";

type Project = {
  id: string; name: string; description: string | null; color: string; status: string;
  due_date: string | null; totalTasks: number; doneTasks: number;
};

const COLORS = ["#6366f1", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#a855f7", "#ec4899", "#14b8a6"];

export function ProjectsClient({ initialProjects }: { initialProjects: Project[] }) {
  const router = useRouter();
  const [show, setShow] = useState(false);
  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground mt-1">{initialProjects.length} projects · {initialProjects.reduce((s, p) => s + p.totalTasks, 0)} total tasks</p>
        </div>
        <Button onClick={() => setShow(true)}><Plus className="h-4 w-4" /> New project</Button>
      </div>

      {initialProjects.length === 0 ? (
        <Card className="p-16 text-center">
          <Folder className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
          <h3 className="font-semibold mb-1">No projects yet</h3>
          <p className="text-sm text-muted-foreground mb-4">Group related tasks together. Start with your first project.</p>
          <Button onClick={() => setShow(true)}>Create first project</Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {initialProjects.map((p) => {
            const pct = p.totalTasks === 0 ? 0 : Math.round((p.doneTasks / p.totalTasks) * 100);
            const due = formatDueDate(p.due_date);
            return (
              <Link key={p.id} href={`/tasks?project=${p.id}`}>
                <Card className="p-5 hover:shadow-md transition-shadow h-full">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="h-3 w-3 rounded-full shrink-0" style={{ background: p.color }} />
                      <h3 className="font-semibold truncate">{p.name}</h3>
                    </div>
                    <Badge className="bg-slate-100 border-slate-200 text-[10px]">{p.status}</Badge>
                  </div>
                  {p.description && <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{p.description}</p>}
                  <div className="mb-2">
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                      <span>{p.doneTasks} / {p.totalTasks} tasks</span>
                      <span>{pct}%</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full transition-all" style={{ width: `${pct}%`, background: p.color }} />
                    </div>
                  </div>
                  {p.due_date && (
                    <div className="text-xs text-muted-foreground mt-3">{due.label}</div>
                  )}
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      <NewProjectDialog open={show} onClose={() => setShow(false)} onCreated={() => router.refresh()} />
    </div>
  );
}

function NewProjectDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const [dueDate, setDueDate] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description: description || null, color, due_date: dueDate || null }),
    });
    setSubmitting(false);
    if (res.ok) { setName(""); setDescription(""); setColor(COLORS[0]); setDueDate(""); onClose(); onCreated(); }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>New project</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-sm font-medium">Name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required autoFocus className="mt-1" placeholder="Q4 marketing campaign" />
          </div>
          <div>
            <label className="text-sm font-medium">Description</label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1" placeholder="Optional" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Target date</label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">Color</label>
              <div className="mt-1 flex gap-1">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={"h-7 w-7 rounded-full border-2 " + (color === c ? "border-foreground" : "border-transparent")}
                    style={{ background: c }}
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={submitting || !name.trim()}>{submitting ? "Creating…" : "Create"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
