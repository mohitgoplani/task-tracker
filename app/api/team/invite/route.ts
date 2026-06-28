import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getSupabaseServer } from "@/lib/supabase/server";

const InviteSchema = z.object({ emails: z.array(z.string().email()).min(1).max(50) });

// Create pending invitation rows. Returns a shareable invite link per email.
// Admins paste the link into Teams / iMessage / email — the invitee clicks it,
// signs in with any Google account, and joins the org automatically.
export async function POST(req: NextRequest) {
  const supabase = getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: me } = await supabase
    .from("profiles")
    .select("org_id, role")
    .eq("id", user.id)
    .single();
  if (!me) return NextResponse.json({ error: "no_profile" }, { status: 400 });
  if (me.role !== "admin") return NextResponse.json({ error: "admin_only" }, { status: 403 });

  const body = InviteSchema.parse(await req.json());
  const inserts = body.emails.map((email) => ({ org_id: me.org_id, email, invited_by: user.id }));

  const { data, error } = await supabase
    .from("invitations")
    .upsert(inserts, { onConflict: "org_id,email" })
    .select("email, token");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  const invites = (data || []).map((row) => ({
    email: row.email,
    inviteUrl: `${appUrl}/invite/${row.token}`,
  }));

  return NextResponse.json({ invited: invites.length, invites });
}
