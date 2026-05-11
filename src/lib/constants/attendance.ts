import type { AttendanceStatus } from "@/lib/types/app";

export const ATTENDANCE_STATUS_OPTIONS: Array<{ label: string; value: AttendanceStatus }> = [
  { label: "Hadir", value: "present" },
  { label: "Tidak Hadir", value: "absent" },
  { label: "Terlambat", value: "late" },
  { label: "Setengah Hari", value: "half_day" },
  { label: "Sakit", value: "sick" },
  { label: "Izin/Cuti", value: "leave" },
];

export function defaultAttendanceAmounts(status: AttendanceStatus) {
  return {
    deductionAmount: 0,
    mealAllowanceAmount: status === "present" || status === "late" ? 0 : 0,
    mealAllowanceEligible: status === "present" || status === "late",
  };
}
