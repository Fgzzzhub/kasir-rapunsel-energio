import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const body = await request.json();

    const { businessId, profileId, expectedCash, actualCash, variance, notes } = body;

    if (!businessId || !profileId) {
      return NextResponse.json({ error: "Data tidak lengkap" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("shift_recaps" as any)
      .insert({
        business_id: businessId,
        created_by: profileId,
        expected_cash: expectedCash,
        actual_cash: actualCash,
        variance,
        notes: notes || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Shift recap error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error: any) {
    console.error("Shift recap exception:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
