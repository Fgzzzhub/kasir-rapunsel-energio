import { z } from "zod";

export const salaryAdjustmentSchema = z.object({
  adjustmentDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal penyesuaian wajib diisi."),
  amount: z.coerce.number().positive("Nominal penyesuaian harus lebih dari nol."),
  businessId: z.string().uuid("Bisnis wajib dipilih."),
  employeeId: z.string().uuid("Karyawan wajib dipilih."),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
  type: z.enum(["bonus", "deduction"], {
    message: "Tipe penyesuaian harus bonus atau potongan.",
  }),
});

export type SalaryAdjustmentSchema = z.infer<typeof salaryAdjustmentSchema>;
