import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

// Handles the OAuth callback from Supabase Auth (Google sign-in).
// Ensures a profile row exists and assigns the user to the default org.
export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") || "/dashboard";

  if (!code) return NextResponse.redirect(`${origin}/auth/login?error=missing_code`);

  const supabase = getSupabaseServer();
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) return NextResponse.redirect(`${origin}/auth/login?error=${encodeURIComponent(exchangeError.message)}`);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${origin}/auth/login?error=no_user`);

  const admin = getSupabaseAdmin();
  const { data: existing } = await admin.from("profiles").select("id, org_id").eq("id", user.id).maybeSingle();

  if (!existing) {
    const { data: anyOrg } = await admin.from("organizations").select("id").limit(1).maybeSingle();

    let orgId = anyOrg?.id;
    let role: "admin" | "member" = "member";

    if (!orgId) {
      const { data: newOrg, error: orgErr } = await admin
        .from("organizations")
        .insert({ name: process.env.DEFAULT_ORG_NAME || "My Team" })
        .select("id")
        .single();
      if (orgErr) return NextResponse.redirect(`${origin}/auth/login?error=${encodeURIComponent(orgErr.message)}`);
      orgId = newOrg.id;
      role = "admin";
    } else {
      const { data: invite } = await admin
        .from("invitations")
        .select("id")
        .eq("org_id", orgId)
        .eq("email", user.email!)
        .is("accepted_at", null)
        .maybeSingle();
      if (!invite) {
        await supabase.auth.signOut();
        return NextResponse.redirect(`${origin}/auth/login?error=not_invited`);
      }
      await admin.from("invitations").update({ accepted_at: new Date().toISOString() }).eq("id", invite.id);
    }

    await admin.from("profiles").insert({
      id: user.id,
      org_id: orgId,
      email: user.email!,
      full_name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
      avatar_url: user.user_metadata?.avatar_url ?? user.user_metadata?.picture ?? null,
      role,
    });
  }

  return NextResponse.redirect(`${origin}${next}`);
}
