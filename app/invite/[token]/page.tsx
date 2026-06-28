import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { Card } from "@/components/ui/card";
import { InviteAcceptButton } from "./InviteAcceptButton";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function InvitePage({ params }: { params: { token: string } }) {
  const admin = getSupabaseAdmin();

  const { data: invite } = await admin
    .from("invitations")
    .select(`
      id, email, accepted_at, token,
      organization:organizations(name),
      inviter:profiles!invitations_invited_by_fkey(full_name, email)
    `)
    .eq("token", params.token)
    .maybeSingle();

  if (!invite) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-50 to-indigo-50">
        <Card className="max-w-md p-8 text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-xl bg-muted text-muted-foreground flex items-center justify-center text-xl font-bold">
            ?
          </div>
          <h1 className="text-xl font-bold">Invitation not found</h1>
          <p className="text-sm text-muted-foreground mt-2">
            This invite link is invalid or has expired. Ask your admin for a fresh one.
          </p>
        </Card>
      </div>
    );
  }

  if (invite.accepted_at) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-50 to-indigo-50">
        <Card className="max-w-md p-8 text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-xl font-bold">
            ✓
          </div>
          <h1 className="text-xl font-bold">Invitation already accepted</h1>
          <p className="text-sm text-muted-foreground mt-2 mb-4">
            This invite has already been used. If that was you, just sign in.
          </p>
          <Link
            href="/auth/login"
            className="inline-block px-4 py-2 rounded-lg border bg-background text-sm font-medium hover:bg-accent"
          >
            Sign in
          </Link>
        </Card>
      </div>
    );
  }

  const orgName = (invite as any).organization?.name || "the team";
  const inviterName =
    (invite as any).inviter?.full_name || (invite as any).inviter?.email || "Someone";

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-50 to-indigo-50">
      <Card className="w-full max-w-md p-8">
        <div className="text-center mb-6">
          <div className="mx-auto mb-4 h-12 w-12 rounded-xl bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold">
            T
          </div>
          <h1 className="text-2xl font-bold tracking-tight">You're invited!</h1>
          <p className="text-sm text-muted-foreground mt-2">
            <span className="font-medium text-foreground">{inviterName}</span> invited you to join{" "}
            <span className="font-medium text-foreground">{orgName}</span> on Task Tracker.
          </p>
        </div>

        <InviteAcceptButton token={params.token} />

        <p className="text-xs text-muted-foreground mt-6 text-center leading-relaxed">
          You'll sign in with Google. Any Google account works — you don't need to use{" "}
          {invite.email}.
        </p>
      </Card>
    </div>
  );
}
