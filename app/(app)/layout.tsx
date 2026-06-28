import { redirect } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabase/server";
import { Sidebar } from "@/components/Sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, org_id, organizations(name)")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/auth/login?error=no_profile");

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        orgName={(profile as any).organizations?.name || "Team"}
        userName={profile.full_name || profile.email}
        userEmail={profile.email}
      />
      <main className="flex-1 overflow-y-auto bg-muted/30">{children}</main>
    </div>
  );
}
