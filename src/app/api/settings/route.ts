import { NextResponse } from "next/server";

import { requireAuthenticatedProfile } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get("businessId");

    if (!businessId) {
      return NextResponse.json({ error: "Missing businessId parameter" }, { status: 400 });
    }

    const session = await requireAuthenticatedProfile();

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("business_settings")
      .select("*")
      .eq("business_id", businessId)
      .single();

    if (error) {
      // If no row exists, just return empty data so frontend can handle it
      if (error.code === "PGRST116") {
        return NextResponse.json({ data: null });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await requireAuthenticatedProfile();

    if (session.profile.role !== "owner") {
      return NextResponse.json({ error: "Akses ditolak. Hanya owner yang dapat mengubah pengaturan." }, { status: 403 });
    }

    const body = await request.json();
    const { businessId, address, phone, receiptFooterText, taxPercentage, serviceChargePercentage, googleSheetsWebhookUrl } = body;

    if (businessId !== session.selectedBusiness.id) {
      return NextResponse.json({ error: "Bisnis tidak valid." }, { status: 403 });
    }

    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("business_settings")
      .update({
        address: address || null,
        phone: phone || null,
        receipt_footer_text: receiptFooterText || null,
        tax_percentage: Number(taxPercentage) || 0,
        service_charge_percentage: Number(serviceChargePercentage) || 0,
        google_sheets_webhook_url: googleSheetsWebhookUrl || null,
      })
      .eq("business_id", businessId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: "Gagal menyimpan pengaturan." }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (e: any) {
    return NextResponse.json({ error: "Terjadi kesalahan sistem.", details: e.message }, { status: 500 });
  }
}
