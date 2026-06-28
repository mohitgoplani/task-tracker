import { getSupabaseServer } from "@/lib/supabase/server";
import { TeamClient } from "./TeamClient";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const supabase = getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  const [profilesRes, invitesRes, meRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, email, full_name, avatar_url, role, created_at")
      .order("full_name"),
    supabase
      .from("invitations")
      .select("id, email, token, created_at, accepted_at")
      .is("accepted_at", null),
    supabase.from("profiles").select("role").eq("id", user!.id).single(),
  ]);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  const pendingInvites = (invitesRes.data || []).map((i) => ({
    id: i.id,
    email: i.email,
    created_at: i.created_at,
    inviteUrl: `${appUrl}/invite/${i.token}`,
  }));

  const isAdmin = meRes.data?.role === "admin";
  return (
    <TeamClient
      members={profilesRes.data || []}
      pendingInvites={pendingInvites}
      isAdmin={isAdmin}
    />
  );
}
