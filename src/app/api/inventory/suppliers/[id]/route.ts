import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const supabase = await createSupabaseServerClient();
  const body = await request.json();
  const { id } = await context.params;

  const { data, error } = await supabase
    .from("suppliers")
    .update({
      name: body.name,
      contact_info: body.contactInfo,
      address: body.address,
      is_active: body.isActive,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}
