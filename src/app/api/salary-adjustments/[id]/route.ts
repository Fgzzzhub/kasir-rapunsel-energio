import { NextResponse } from "next/server";

import { requireApiAuth } from "@/lib/auth/api";
import { salaryAdjustmentSchema } from "@/lib/schemas/salary-adjustment";

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
    .update({
      adjustment_date: parsed.data.adjustmentDate,
      amount: parsed.data.amount,
      business_id: parsed.data.businessId,
      employee_id: parsed.data.employeeId,
      notes: parsed.data.notes || null,
      type: parsed.data.type,
    })
    .eq("id", id)
    .select("*")
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
        error: "Penyesuaian gaji tidak ditemukan.",
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
  const { error } = await auth.supabase.from("salary_adjustments").delete().eq("id", id);

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
