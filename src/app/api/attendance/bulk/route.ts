import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { requireApiAuth } from "@/lib/auth/api";
import { BUSINESS_COOKIE_NAME, DEFAULT_BUSINESS_SLUG } from "@/lib/constants/app";
import { attendanceBulkSchema } from "@/lib/schemas/attendance";

export async function POST(request: Request) {
  const auth = await requireApiAuth(["owner", "admin"]);

  if (auth instanceof NextResponse) {
    return auth;
  }

  const parsed = attendanceBulkSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Data absensi massal tidak valid." },
      { status: 400 },
    );
  }

  const { data: business } = await auth.supabase
    .from("businesses")
    .select("slug")
    .eq("id", parsed.data.businessId)
    .maybeSingle();

  if (!business) {
    return NextResponse.json({ error: "Bisnis tidak ditemukan." }, { status: 400 });
  }

  if (auth.profile.role !== "owner") {
    const cookieStore = await cookies();
    const selectedSlug = cookieStore.get(BUSINESS_COOKIE_NAME)?.value ?? DEFAULT_BUSINESS_SLUG;

    if (business.slug !== selectedSlug) {
      return NextResponse.json({ error: "Admin tidak dapat input absensi di luar bisnis terpilih." }, { status: 403 });
    }
  }

  const employeeIds = parsed.data.records.map((record) => record.employeeId);
  const { data: employees } = await auth.supabase
    .from("employees")
    .select("id")
    .eq("business_id", parsed.data.businessId)
    .eq("is_active", true)
    .in("id", employeeIds);
  const validEmployeeIds = new Set((employees ?? []).map((employee) => employee.id));

  if (validEmployeeIds.size !== new Set(employeeIds).size) {
    return NextResponse.json({ error: "Ada karyawan yang tidak valid untuk bisnis ini." }, { status: 400 });
  }

  const rows = parsed.data.records.map((record) => ({
    attendance_date: parsed.data.attendanceDate,
    business_id: parsed.data.businessId,
    check_in_time: record.checkInTime || null,
    check_out_time: record.checkOutTime || null,
    created_by: auth.user.id,
    deduction_amount: record.deductionAmount,
    employee_id: record.employeeId,
    meal_allowance_amount: record.mealAllowanceAmount,
    meal_allowance_eligible: record.mealAllowanceEligible,
    notes: record.notes || null,
    status: record.status,
  }));

  const { data, error } = await auth.supabase
    .from("attendance_records")
    .upsert(rows, { onConflict: "business_id,employee_id,attendance_date" })
    .select("*");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ data });
}
