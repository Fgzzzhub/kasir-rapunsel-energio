import { NextResponse } from "next/server";

import { requireAuthenticatedProfile } from "@/lib/auth/session";
import { productSchema } from "@/lib/schemas/product";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function PATCH(request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await props.params;
    const session = await requireAuthenticatedProfile();

    if (session.profile.role !== "owner") {
      return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
    }

    const body = await request.json();
    const result = productSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
    }

    const { businessId, category, description, isActive, name, price, sku, trackStock, costPrice, minimumStock } = result.data;

    if (businessId !== session.selectedBusiness.id) {
      return NextResponse.json({ error: "Bisnis tidak valid." }, { status: 403 });
    }

    const supabase = await createSupabaseServerClient();

    const { error } = await supabase
      .from("products")
      .update({
        category: category || null,
        description: description || null,
        is_active: isActive,
        name,
        price,
        sku: sku || null,
        track_stock: trackStock,
        cost_price: costPrice,
        minimum_stock: minimumStock,
      })
      .eq("id", id)
      .eq("business_id", businessId);

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "Nama produk sudah terdaftar pada bisnis ini." },
          { status: 400 }
        );
      }
      return NextResponse.json({ error: "Gagal memperbarui produk." }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Terjadi kesalahan sistem." }, { status: 500 });
  }
}
