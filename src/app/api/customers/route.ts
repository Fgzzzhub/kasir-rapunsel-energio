import { NextResponse } from "next/server";

import { requireAuthenticatedProfile } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    await requireAuthenticatedProfile();

    const { searchParams } = new URL(request.url);
    const phone = searchParams.get("phone");

    if (!phone) {
      return NextResponse.json({ error: "Nomor telepon diperlukan." }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("customers")
      .select("id, name, phone")
      .eq("phone", phone)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: "Gagal mencari pelanggan." }, { status: 500 });
    }

    return NextResponse.json({ data: data || null });
  } catch {
    return NextResponse.json({ error: "Terjadi kesalahan sistem." }, { status: 500 });
  }
}
