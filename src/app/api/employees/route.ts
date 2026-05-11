import { NextResponse } from "next/server";

import { requireApiAuth } from "@/lib/auth/api";
import { employeeSchema } from "@/lib/schemas/employee";

export async function POST(request: Request) {
  const auth = await requireApiAuth(["owner"]);

  if (auth instanceof NextResponse) {
    return auth;
  }

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
    .insert({
      base_salary: parsed.data.baseSalary,
      business_id: parsed.data.businessId,
      commission_rate: parsed.data.commissionRate,
      is_active: parsed.data.isActive ?? true,
      name: parsed.data.name,
      phone: parsed.data.phone || null,
      position: parsed.data.position || null,
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
