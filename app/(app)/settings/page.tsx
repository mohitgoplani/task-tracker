import { getSupabaseServer } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { CalendarFeedSection } from "./CalendarFeedSection";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, full_name, avatar_url, role, calendar_token, organizations(name)")
    .eq("id", user!.id)
    .single();

  const orgName = (profile as any)?.organizations?.name;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  const feedUrl = profile?.calendar_token ? `${appUrl}/api/feed/${profile.calendar_token}` : "";

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold tracking-tight mb-6">Settings</h1>

      <Card className="p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Profile</h2>
        <div className="flex items-center gap-4">
          <Avatar size={64} name={profile?.full_name} email={profile?.email} src={profile?.avatar_url} />
          <div>
            <div className="font-medium">{profile?.full_name || profile?.email}</div>
            <div className="text-sm text-muted-foreground">{profile?.email}</div>
            <div className="mt-2">
              <Badge className={profile?.role === "admin" ? "bg-violet-100 border-violet-200 text-violet-700" : "bg-slate-100 border-slate-200"}>
                {profile?.role}
              </Badge>
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-6 mb-6">
        <h2 className="text-lg font-semibold mb-2">Organization</h2>
        <div className="text-sm text-muted-foreground">{orgName}</div>
      </Card>

      <CalendarFeedSection feedUrl={feedUrl} />
    </div>
  );
}
