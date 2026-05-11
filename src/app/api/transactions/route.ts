import { NextResponse } from "next/server";

import { requireApiAuth } from "@/lib/auth/api";
import { transactionSchema } from "@/lib/schemas/transaction";
import type { TransactionSummary } from "@/lib/types/app";
import { toNumber } from "@/lib/utils/currency";

export async function POST(request: Request) {
  const auth = await requireApiAuth(["owner", "admin"]);

  if (auth instanceof NextResponse) {
    return auth;
  }

  const body = await request.json();
  const parsed = transactionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: parsed.error.issues[0]?.message ?? "Data transaksi tidak valid.",
      },
      { status: 400 },
    );
  }

  // Validate product restriction server-side: fetch business slug from DB
  if (parsed.data.products && parsed.data.products.length > 0) {
    const { data: businessData } = await auth.supabase
      .from("businesses")
      .select("slug")
      .eq("id", parsed.data.businessId)
      .single();
    if (!businessData || businessData.slug !== "rapunsel-salon") {
      return NextResponse.json(
        { error: "Produk hanya dapat ditambahkan untuk Rapunsel Salon." },
        { status: 400 }
      );
    }
  }

  const { data, error } = await auth.supabase.rpc("create_transaction", {
    p_business_id: parsed.data.businessId,
    p_created_by: auth.user.id,
    p_customer_name: parsed.data.customerName,
    p_customer_phone: parsed.data.customerPhone || null,
    p_services: parsed.data.services,
    p_products: parsed.data.products,
    p_notes: parsed.data.notes || null,
    p_payment_method: parsed.data.paymentMethod,
    p_tax_amount: parsed.data.taxAmount,
    p_service_charge_amount: parsed.data.serviceChargeAmount,
  });

  if (error) {
    return NextResponse.json(
      {
        error: error.message,
      },
      { status: 400 },
    );
  }

  const payload = data as Record<string, unknown>;
  const summary: TransactionSummary = {
    businessId: String(payload.business_id),
    businessName: String(payload.business_name),
    createdAt: String(payload.created_at),
    customerName: String(payload.customer_name),
    customerPhone: payload.customer_phone ? String(payload.customer_phone) : null,
    paymentMethod: String(payload.payment_method) as TransactionSummary["paymentMethod"],
    totalAmount: toNumber(payload.total_amount as string | number),
    totalCommission: toNumber(payload.total_commission as string | number),
    transactionId: String(payload.transaction_id),
  };

  return NextResponse.json({ data: summary });
}
