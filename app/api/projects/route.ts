import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getSupabaseServer } from "@/lib/supabase/server";

const CreateProjectSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional().nullable(),
  color: z.string().default("#6366f1"),
  due_date: z.string().optional().nullable(),
});

export async function POST(req: NextRequest) {
  const supabase = getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data: profile } = await supabase.from("profiles").select("org_id").eq("id", user.id).single();
  if (!profile) return NextResponse.json({ error: "no_profile" }, { status: 400 });

  const body = CreateProjectSchema.parse(await req.json());
  const { data, error } = await supabase
    .from("projects")
    .insert({ ...body, org_id: profile.org_id, created_by: user.id })
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
