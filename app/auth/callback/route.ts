import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

// Handles the OAuth callback from Supabase Auth (Google sign-in).
// Supports two paths:
//   1. First user signs in -> becomes admin of a brand-new org
//   2. Subsequent users sign in via an invitation:
//        a) email-matched invitation (from the Team page)
//        b) token-based invitation (via /invite/[token] share link) - any email works
export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") || "/dashboard";
  const inviteToken = searchParams.get("invite_token");

  if (!code) return NextResponse.redirect(`${origin}/auth/login?error=missing_code`);

  const supabase = getSupabaseServer();
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) {
    return NextResponse.redirect(
      `${origin}/auth/login?error=${encodeURIComponent(exchangeError.message)}`
    );
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${origin}/auth/login?error=no_user`);

  const admin = getSupabaseAdmin();
  const { data: existing } = await admin
    .from("profiles")
    .select("id, org_id")
    .eq("id", user.id)
    .maybeSingle();

  if (existing) {
    // Already onboarded — just continue
    return NextResponse.redirect(`${origin}${next}`);
  }

  // New user — figure out which org to join
  const { data: anyOrg } = await admin.from("organizations").select("id").limit(1).maybeSingle();
  let orgId = anyOrg?.id;
  let role: "admin" | "member" = "member";
  let acceptedInviteId: string | null = null;

  if (!orgId) {
    // No org exists yet — this user creates one and becomes admin
    const { data: newOrg, error: orgErr } = await admin
      .from("organizations")
      .insert({ name: process.env.DEFAULT_ORG_NAME || "My Team" })
      .select("id")
      .single();
    if (orgErr) {
      return NextResponse.redirect(`${origin}/auth/login?error=${encodeURIComponent(orgErr.message)}`);
    }
    orgId = newOrg.id;
    role = "admin";
  } else {
    // Org exists — must have a valid invitation to join
    let invite: { id: string; org_id: string } | null = null;

    if (inviteToken) {
      // Token-based invite: any signed-in Google account is welcomed
      const { data } = await admin
        .from("invitations")
        .select("id, org_id")
        .eq("token", inviteToken)
        .is("accepted_at", null)
        .maybeSingle();
      invite = data;
    } else {
      // Email-matched invite
      const { data } = await admin
        .from("invitations")
        .select("id, org_id")
        .eq("org_id", orgId)
        .eq("email", user.email!)
        .is("accepted_at", null)
        .maybeSingle();
      invite = data;
    }

    if (!invite) {
      await supabase.auth.signOut();
      return NextResponse.redirect(`${origin}/auth/login?error=not_invited`);
    }

    orgId = invite.org_id;
    acceptedInviteId = invite.id;
  }

  await admin.from("profiles").insert({
    id: user.id,
    org_id: orgId,
    email: user.email!,
    full_name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
    avatar_url: user.user_metadata?.avatar_url ?? user.user_metadata?.picture ?? null,
    role,
  });

  if (acceptedInviteId) {
    await admin
      .from("invitations")
      .update({ accepted_at: new Date().toISOString() })
      .eq("id", acceptedInviteId);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
