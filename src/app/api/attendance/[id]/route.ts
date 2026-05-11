import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { requireApiAuth } from "@/lib/auth/api";
import { BUSINESS_COOKIE_NAME, DEFAULT_BUSINESS_SLUG } from "@/lib/constants/app";
import { attendanceSchema } from "@/lib/schemas/attendance";

async function canAccessBusiness(
  auth: Exclude<Awaited<ReturnType<typeof requireApiAuth>>, NextResponse>,
  businessId: string,
) {
  if (auth.profile.role === "owner") return true;

  const cookieStore = await cookies();
  const selectedSlug = cookieStore.get(BUSINESS_COOKIE_NAME)?.value ?? DEFAULT_BUSINESS_SLUG;
  const { data } = await auth.supabase
    .from("businesses")
    .select("slug")
    .eq("id", businessId)
    .maybeSingle();

  return data?.slug === selectedSlug;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiAuth(["owner", "admin"]);

  if (auth instanceof NextResponse) {
    return auth;
  }

  const { id } = await params;
  const parsed = attendanceSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Data absensi tidak valid." },
      { status: 400 },
    );
  }

  if (!(await canAccessBusiness(auth, parsed.data.businessId))) {
    return NextResponse.json({ error: "Akses absensi bisnis ini ditolak." }, { status: 403 });
  }

  const { data: employee } = await auth.supabase
    .from("employees")
    .select("id")
    .eq("id", parsed.data.employeeId)
    .eq("business_id", parsed.data.businessId)
    .eq("is_active", true)
    .maybeSingle();

  if (!employee) {
    return NextResponse.json({ error: "Karyawan tidak valid untuk bisnis ini." }, { status: 400 });
  }

  const { data, error } = await auth.supabase
    .from("attendance_records")
    .update({
      attendance_date: parsed.data.attendanceDate,
      business_id: parsed.data.businessId,
      check_in_time: parsed.data.checkInTime || null,
      check_out_time: parsed.data.checkOutTime || null,
      deduction_amount: parsed.data.deductionAmount,
      employee_id: parsed.data.employeeId,
      meal_allowance_amount: parsed.data.mealAllowanceAmount,
      meal_allowance_eligible: parsed.data.mealAllowanceEligible,
      notes: parsed.data.notes || null,
      status: parsed.data.status,
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json(
      {
        error:
          error.code === "23505"
            ? "Absensi karyawan untuk tanggal ini sudah ada."
            : error.message,
      },
      { status: error.code === "23505" ? 409 : 400 },
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
  const { error } = await auth.supabase.from("attendance_records").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ data: { id } });
}
