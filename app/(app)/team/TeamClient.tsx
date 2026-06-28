"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Check, Copy, Mail, UserPlus } from "lucide-react";
import { relativeTime } from "@/lib/utils";

type Member = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string;
};
type Invite = { id: string; email: string; created_at: string; inviteUrl: string };

export function TeamClient({
  members,
  pendingInvites,
  isAdmin,
}: {
  members: Member[];
  pendingInvites: Invite[];
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [show, setShow] = useState(false);

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Team</h1>
          <p className="text-muted-foreground mt-1">
            {members.length} member{members.length === 1 ? "" : "s"}
            {pendingInvites.length > 0
              ? ` · ${pendingInvites.length} pending invite${pendingInvites.length === 1 ? "" : "s"}`
              : ""}
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => setShow(true)}>
            <UserPlus className="h-4 w-4" /> Invite
          </Button>
        )}
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
              <Badge
                className={
                  m.role === "admin"
                    ? "bg-violet-100 border-violet-200 text-violet-700 text-[10px]"
                    : "bg-slate-100 border-slate-200 text-[10px]"
                }
              >
                {m.role}
              </Badge>
            </li>
          ))}
        </ul>
      </Card>

      {pendingInvites.length > 0 && (
        <div className="mt-6">
          <h2 className="text-sm font-semibold mb-2 text-muted-foreground">
            Pending invitations
          </h2>
          <Card className="overflow-hidden">
            <ul className="divide-y">
              {pendingInvites.map((i) => (
                <PendingInviteRow key={i.id} invite={i} />
              ))}
            </ul>
          </Card>
        </div>
      )}

      <InviteDialog
        open={show}
        onClose={() => setShow(false)}
        onInvited={() => router.refresh()}
      />
    </div>
  );
}

function PendingInviteRow({ invite }: { invite: Invite }) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    await navigator.clipboard.writeText(invite.inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <li className="px-5 py-3 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center shrink-0">
          <Mail className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="min-w-0">
          <div className="font-medium text-sm truncate">{invite.email}</div>
          <div className="text-xs text-muted-foreground">
            Invited {relativeTime(invite.created_at)}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Button variant="outline" size="sm" onClick={copyLink}>
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5" /> Copied
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" /> Copy invite link
            </>
          )}
        </Button>
        <Badge className="bg-amber-100 border-amber-200 text-amber-700 text-[10px]">
          Pending
        </Badge>
      </div>
    </li>
  );
}

function InviteDialog({
  open,
  onClose,
  onInvited,
}: {
  open: boolean;
  onClose: () => void;
  onInvited: () => void;
}) {
  const [emails, setEmails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [createdInvites, setCreatedInvites] = useState<{ email: string; inviteUrl: string }[]>([]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const list = emails
      .split(/[\s,;]+/)
      .map((s) => s.trim())
      .filter((s) => /\S+@\S+\.\S+/.test(s));
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
      setCreatedInvites(j.invites || []);
      setEmails("");
      onInvited();
    } else {
      const j = await res.json().catch(() => ({}));
      alert(`Error: ${j.error || res.statusText}`);
    }
  }

  function close() {
    setCreatedInvites([]);
    setEmails("");
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Invite team members</DialogTitle>
          <DialogDescription>
            Paste emails separated by commas or new lines. You'll get a shareable link for each —
            send it via Teams, iMessage, or however you reach your team.
          </DialogDescription>
        </DialogHeader>

        {createdInvites.length === 0 ? (
          <form onSubmit={submit} className="space-y-3">
            <textarea
              value={emails}
              onChange={(e) => setEmails(e.target.value)}
              placeholder="jane@stevens.edu, john@stevens.edu"
              className="w-full min-h-[120px] rounded-lg border bg-background p-3 text-sm"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={close}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Creating…" : "Create invite links"}
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-3">
            <div className="text-sm font-medium">
              {createdInvites.length} invite{createdInvites.length === 1 ? "" : "s"} created. Copy
              and share each link:
            </div>
            <ul className="space-y-2 max-h-72 overflow-y-auto">
              {createdInvites.map((inv) => (
                <CreatedInviteRow key={inv.email} email={inv.email} url={inv.inviteUrl} />
              ))}
            </ul>
            <div className="flex justify-end pt-2">
              <Button onClick={close}>Done</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function CreatedInviteRow({ email, url }: { email: string; url: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <li className="rounded-lg border p-3 bg-muted/30">
      <div className="text-sm font-medium mb-1">{email}</div>
      <div className="flex items-center gap-2">
        <input
          readOnly
          value={url}
          className="flex-1 h-8 px-2 rounded-md border bg-background text-xs font-mono"
          onClick={(e) => (e.target as HTMLInputElement).select()}
        />
        <Button variant="outline" size="sm" onClick={copy}>
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5" /> Copied
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" /> Copy
            </>
          )}
        </Button>
      </div>
    </li>
  );
}
