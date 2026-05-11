import { z } from "zod";

export const attendanceStatusSchema = z.enum([
  "present",
  "absent",
  "late",
  "half_day",
  "sick",
  "leave",
]);

export const attendanceSchema = z.object({
  attendanceDate: z.string().min(1, "Tanggal absensi wajib diisi."),
  businessId: z.string().uuid("Bisnis wajib dipilih."),
  checkInTime: z.string().optional().nullable().or(z.literal("")),
  checkOutTime: z.string().optional().nullable().or(z.literal("")),
  deductionAmount: z.number().min(0, "Potongan tidak boleh negatif."),
  employeeId: z.string().uuid("Karyawan wajib dipilih."),
  mealAllowanceAmount: z.number().min(0, "Uang makan tidak boleh negatif."),
  mealAllowanceEligible: z.boolean(),
  notes: z.string().trim().max(500).optional().nullable().or(z.literal("")),
  status: attendanceStatusSchema,
});

export const attendanceBulkSchema = z.object({
  businessId: z.string().uuid("Bisnis wajib dipilih."),
  attendanceDate: z.string().min(1, "Tanggal absensi wajib diisi."),
  records: z.array(attendanceSchema.omit({ businessId: true, attendanceDate: true })).min(1),
});

export type AttendanceSchema = z.infer<typeof attendanceSchema>;
