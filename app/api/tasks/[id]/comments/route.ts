import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("comments")
    .select("id, body, created_at, author:profiles(id, full_name, email, avatar_url)")
    .eq("task_id", params.id)
    .order("created_at", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { body } = await req.json();
  if (!body || typeof body !== "string") return NextResponse.json({ error: "body_required" }, { status: 400 });

  const { data, error } = await supabase
    .from("comments")
    .insert({ task_id: params.id, author_id: user.id, body })
    .select("id, body, created_at, author:profiles(id, full_name, email, avatar_url)")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
