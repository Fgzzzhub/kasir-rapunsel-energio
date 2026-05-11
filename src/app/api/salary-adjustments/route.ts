import { NextResponse } from "next/server";

import { requireApiAuth } from "@/lib/auth/api";
import { salaryAdjustmentSchema } from "@/lib/schemas/salary-adjustment";

export async function POST(request: Request) {
  const auth = await requireApiAuth(["owner"]);

  if (auth instanceof NextResponse) {
    return auth;
  }

  const body = await request.json();
  const parsed = salaryAdjustmentSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: parsed.error.issues[0]?.message ?? "Data penyesuaian gaji tidak valid.",
      },
      { status: 400 },
    );
  }

  const { data, error } = await auth.supabase
    .from("salary_adjustments")
    .insert({
      adjustment_date: parsed.data.adjustmentDate,
      amount: parsed.data.amount,
      business_id: parsed.data.businessId,
      created_by: auth.user.id,
      employee_id: parsed.data.employeeId,
      notes: parsed.data.notes || null,
      type: parsed.data.type,
    })
    .select("*")
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
