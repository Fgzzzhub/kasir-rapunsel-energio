import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const businessId = searchParams.get("businessId");
  const productId = searchParams.get("productId");

  if (!businessId) {
    return NextResponse.json({ error: "Missing businessId parameter" }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from("stock_movements")
    .select(`
      *,
      products!inner (name),
      suppliers (name),
      profiles!stock_movements_created_by_fkey (name)
    `)
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });

  if (productId) {
    query = query.eq("product_id", productId);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const body = await request.json();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase.rpc("record_stock_movement", {
    p_product_id: body.productId,
    p_business_id: body.businessId,
    p_movement_type: body.movementType,
    p_quantity: Number(body.quantity),
    p_notes: body.notes || null,
    p_supplier_id: body.supplierId || null,
    p_created_by: user.id,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}
