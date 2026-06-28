import { getSupabaseServer } from "@/lib/supabase/server";
import { TeamClient } from "./TeamClient";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const supabase = getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  const [profilesRes, invitesRes, meRes] = await Promise.all([
    supabase.from("profiles").select("id, email, full_name, avatar_url, role, microsoft_account_email, created_at").order("full_name"),
    supabase.from("invitations").select("id, email, created_at, accepted_at").is("accepted_at", null),
    supabase.from("profiles").select("role").eq("id", user!.id).single(),
  ]);

  const isAdmin = meRes.data?.role === "admin";
  return (
    <TeamClient
      members={profilesRes.data || []}
      pendingInvites={invitesRes.data || []}
      isAdmin={isAdmin}
    />
  );
}
