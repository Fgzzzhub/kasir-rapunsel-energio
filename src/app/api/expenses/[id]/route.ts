import { NextResponse } from "next/server";

import { requireApiAuth } from "@/lib/auth/api";
import { expenseSchema } from "@/lib/schemas/expense";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiAuth(["owner"]);

  if (auth instanceof NextResponse) {
    return auth;
  }

  const { id } = await params;
  const body = await request.json();
  const parsed = expenseSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: parsed.error.issues[0]?.message ?? "Data pengeluaran tidak valid.",
      },
      { status: 400 },
    );
  }

  const { data, error } = await auth.supabase
    .from("expenses")
    .update({
      amount: parsed.data.amount,
      business_id: parsed.data.businessId,
      category: parsed.data.category,
      expense_date: parsed.data.expenseDate,
      name: parsed.data.name,
      notes: parsed.data.notes || null,
    })
    .eq("id", id)
    .select("*, business:businesses(id, name, slug, theme)")
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      {
        error: error.message,
      },
      { status: 400 },
    );
  }

  if (!data) {
    return NextResponse.json(
      {
        error: "Pengeluaran tidak ditemukan.",
      },
      { status: 404 },
    );
  }

  return NextResponse.json({ data });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiAuth(["owner"]);

  if (auth instanceof NextResponse) {
    return auth;
  }

  const { id } = await params;
  const { error } = await auth.supabase.from("expenses").delete().eq("id", id);

  if (error) {
    return NextResponse.json(
      {
        error: error.message,
      },
      { status: 400 },
    );
  }

  return NextResponse.json({ success: true });
}
