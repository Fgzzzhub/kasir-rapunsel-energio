import { NextResponse } from "next/server";

import { requireApiAuth } from "@/lib/auth/api";
import { employeeSchema } from "@/lib/schemas/employee";

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
  const parsed = employeeSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: parsed.error.issues[0]?.message ?? "Data karyawan tidak valid.",
      },
      { status: 400 },
    );
  }

  const { data, error } = await auth.supabase
    .from("employees")
    .update({
      base_salary: parsed.data.baseSalary,
      business_id: parsed.data.businessId,
      commission_rate: parsed.data.commissionRate,
      is_active: parsed.data.isActive ?? true,
      name: parsed.data.name,
      phone: parsed.data.phone || null,
      position: parsed.data.position || null,
    })
    .eq("id", id)
    .eq("business_id", parsed.data.businessId)
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
        error: "Karyawan tidak ditemukan.",
      },
      { status: 404 },
    );
  }

  return NextResponse.json({ data });
}
