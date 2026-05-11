import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  AppRole,
  AttendanceEmployeeSummary,
  AttendanceListItem,
} from "@/lib/types/app";
import { toNumber } from "@/lib/utils/currency";
import { getMonthRangeFromInput, getTodayDateValue } from "@/lib/utils/date";

export async function getAttendanceRecords({
  businessId,
  employeeId,
  endDate,
  role,
  scope = "selected",
  startDate,
  status,
}: {
  businessId: string;
  employeeId?: string;
  endDate?: string;
  role: AppRole;
  scope?: "selected" | "combined";
  startDate?: string;
  status?: string;
}) {
  const supabase = await createSupabaseServerClient();
  const monthRange = getMonthRangeFromInput();
  const resolvedStartDate = startDate || monthRange.startDate;
  const resolvedEndDate = endDate || getTodayDateValue();

  let query = supabase
    .from("attendance_records")
    .select("*, business:businesses(id, name, slug, theme), employee:employees(id, name)")
    .gte("attendance_date", resolvedStartDate)
    .lte("attendance_date", resolvedEndDate)
    .order("attendance_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (!(role === "owner" && scope === "combined")) {
    query = query.eq("business_id", businessId);
  }

  if (employeeId) {
    query = query.eq("employee_id", employeeId);
  }

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) throw new Error(error.message);

  const records = (data ?? []) as unknown as AttendanceListItem[];
  const employeeSummaryMap = new Map<string, AttendanceEmployeeSummary>();

  records.forEach((record) => {
    const current = employeeSummaryMap.get(record.employee_id) ?? {
      absentDays: 0,
      employeeId: record.employee_id,
      employeeName: record.employee?.name ?? "Karyawan tidak diketahui",
      halfDays: 0,
      lateDays: 0,
      leaveDays: 0,
      presentDays: 0,
      sickDays: 0,
      totalAttendanceDeduction: 0,
      totalMealAllowance: 0,
    };

    if (record.status === "present") current.presentDays += 1;
    if (record.status === "absent") current.absentDays += 1;
    if (record.status === "late") current.lateDays += 1;
    if (record.status === "half_day") current.halfDays += 1;
    if (record.status === "sick") current.sickDays += 1;
    if (record.status === "leave") current.leaveDays += 1;

    current.totalMealAllowance += toNumber(record.meal_allowance_amount);
    current.totalAttendanceDeduction += toNumber(record.deduction_amount);
    employeeSummaryMap.set(record.employee_id, current);
  });

  return {
    endDate: resolvedEndDate,
    records,
    startDate: resolvedStartDate,
    summary: {
      absent: records.filter((record) => record.status === "absent").length,
      halfDay: records.filter((record) => record.status === "half_day").length,
      late: records.filter((record) => record.status === "late").length,
      leaveOrSick: records.filter((record) => record.status === "leave" || record.status === "sick").length,
      present: records.filter((record) => record.status === "present").length,
      totalDeduction: records.reduce((sum, record) => sum + toNumber(record.deduction_amount), 0),
      totalMealAllowance: records.reduce(
        (sum, record) => sum + toNumber(record.meal_allowance_amount),
        0,
      ),
    },
    summaryByEmployee: Array.from(employeeSummaryMap.values()).sort((left, right) =>
      left.employeeName.localeCompare(right.employeeName, "id-ID"),
    ),
  };
}
