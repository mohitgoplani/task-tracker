"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Mail, UserPlus } from "lucide-react";
import { relativeTime } from "@/lib/utils";

type Member = { id: string; email: string; full_name: string | null; avatar_url: string | null; role: string; microsoft_account_email: string | null };
type Invite = { id: string; email: string; created_at: string };

export function TeamClient({ members, pendingInvites, isAdmin }: { members: Member[]; pendingInvites: Invite[]; isAdmin: boolean }) {
  const router = useRouter();
  const [show, setShow] = useState(false);

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Team</h1>
          <p className="text-muted-foreground mt-1">{members.length} member{members.length === 1 ? "" : "s"}{pendingInvites.length > 0 ? ` · ${pendingInvites.length} pending invite${pendingInvites.length === 1 ? "" : "s"}` : ""}</p>
        </div>
        {isAdmin && <Button onClick={() => setShow(true)}><UserPlus className="h-4 w-4" /> Invite</Button>}
      </div>

      <Card className="overflow-hidden">
        <ul className="divide-y">
          {members.map((m) => (
            <li key={m.id} className="px-5 py-3 flex items-center gap-3">
              <Avatar size={36} name={m.full_name} email={m.email} src={m.avatar_url} />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">{m.full_name || m.email}</div>
                <div className="text-xs text-muted-foreground">{m.email}</div>
              </div>
              <div className="flex items-center gap-2">
                {m.microsoft_account_email && (
                  <Badge className="bg-blue-50 border-blue-200 text-blue-700 text-[10px]">Outlook synced</Badge>
                )}
                <Badge className={m.role === "admin" ? "bg-violet-100 border-violet-200 text-violet-700 text-[10px]" : "bg-slate-100 border-slate-200 text-[10px]"}>
                  {m.role}
                </Badge>
              </div>
            </li>
          ))}
        </ul>
      </Card>

      {pendingInvites.length > 0 && (
        <div className="mt-6">
          <h2 className="text-sm font-semibold mb-2 text-muted-foreground">Pending invitations</h2>
          <Card className="overflow-hidden">
            <ul className="divide-y">
              {pendingInvites.map((i) => (
                <li key={i.id} className="px-5 py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <div className="font-medium text-sm">{i.email}</div>
                      <div className="text-xs text-muted-foreground">Invited {relativeTime(i.created_at)}</div>
                    </div>
                  </div>
                  <Badge className="bg-amber-100 border-amber-200 text-amber-700 text-[10px]">Pending</Badge>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}

      <InviteDialog open={show} onClose={() => setShow(false)} onInvited={() => router.refresh()} />
    </div>
  );
}

function InviteDialog({ open, onClose, onInvited }: { open: boolean; onClose: () => void; onInvited: () => void }) {
  const [emails, setEmails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const list = emails.split(/[\s,;]+/).map((s) => s.trim()).filter((s) => /\S+@\S+\.\S+/.test(s));
    if (!list.length) return;
    setSubmitting(true);
    const res = await fetch("/api/team/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emails: list }),
    });
    setSubmitting(false);
    if (res.ok) {
      const j = await res.json();
      setResult(`Invited ${j.invited}${j.failed > 0 ? ` (${j.failed} email failures)` : ""}`);
      setEmails("");
      onInvited();
      setTimeout(() => { setResult(null); onClose(); }, 1500);
    } else {
      const j = await res.json().catch(() => ({}));
      setResult(`Error: ${j.error || res.statusText}`);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Invite team members</DialogTitle>
          <DialogDescription>Paste emails separated by commas, spaces, or new lines.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <textarea
            value={emails}
            onChange={(e) => setEmails(e.target.value)}
            placeholder="jane@company.com, john@company.com"
            className="w-full min-h-[120px] rounded-lg border bg-background p-3 text-sm"
            autoFocus
          />
          {result && <div className="text-sm">{result}</div>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={submitting}>{submitting ? "Sending…" : "Send invites"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
