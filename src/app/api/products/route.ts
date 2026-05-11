import { NextResponse } from "next/server";

import { requireAuthenticatedProfile } from "@/lib/auth/session";
import { productSchema } from "@/lib/schemas/product";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const session = await requireAuthenticatedProfile();

    if (session.profile.role !== "owner") {
      return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
    }

    const body = await request.json();
    const result = productSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
    }

    const { businessId, category, description, isActive, name, price, sku, trackStock, costPrice, minimumStock, initialStock } = result.data;

    // Verify business ownership
    if (businessId !== session.selectedBusiness.id) {
      return NextResponse.json({ error: "Bisnis tidak valid." }, { status: 403 });
    }

    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase.from("products").insert({
      business_id: businessId,
      category: category || null,
      description: description || null,
      is_active: isActive,
      name,
      price,
      sku: sku || null,
      track_stock: trackStock,
      current_stock: 0,
      minimum_stock: minimumStock,
      cost_price: costPrice,
    }).select().single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "Nama produk sudah terdaftar pada bisnis ini." },
          { status: 400 }
        );
      }
      return NextResponse.json({ error: "Gagal menyimpan produk." }, { status: 500 });
    }

    if (trackStock && initialStock > 0 && data) {
      await supabase.rpc("record_stock_movement", {
        p_product_id: data.id,
        p_business_id: businessId,
        p_movement_type: "in",
        p_quantity: initialStock,
        p_notes: "Initial product creation",
        p_supplier_id: null,
        p_created_by: session.user.id,
      });
    }

    return NextResponse.json({ success: true, data });
  } catch (e: any) {
    return NextResponse.json({ error: "Terjadi kesalahan sistem.", details: e.message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const businessId = searchParams.get("businessId");

  if (!businessId) {
    return NextResponse.json({ error: "Missing businessId parameter" }, { status: 400 });
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("business_id", businessId)
      .order("name", { ascending: true });

    if (error) throw error;

    return NextResponse.json({ data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
