import { NextResponse } from "next/server";

import { requireApiAuth } from "@/lib/auth/api";
import { expenseSchema } from "@/lib/schemas/expense";

export async function POST(request: Request) {
  const auth = await requireApiAuth(["owner"]);

  if (auth instanceof NextResponse) {
    return auth;
  }

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
    .insert({
      amount: parsed.data.amount,
      business_id: parsed.data.businessId,
      category: parsed.data.category,
      created_by: auth.user.id,
      expense_date: parsed.data.expenseDate,
      name: parsed.data.name,
      notes: parsed.data.notes || null,
    })
    .select("*, business:businesses(id, name, slug, theme)")
    .single();

  if (error) {
    return NextResponse.json(
      {
        error: error.message,
      },
      { status: 400 },
    );
  }

  return NextResponse.json({ data });
}
