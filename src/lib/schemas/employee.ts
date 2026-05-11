import { z } from "zod";

export const employeeSchema = z.object({
  baseSalary: z.coerce.number().min(0, "Gaji pokok tidak boleh negatif."),
  businessId: z.string().uuid(),
  commissionRate: z.coerce
    .number()
    .min(0, "Komisi tidak boleh negatif.")
    .max(100, "Komisi maksimal 100%."),
  isActive: z.boolean().optional(),
  name: z.string().trim().min(2, "Nama karyawan minimal 2 karakter."),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  position: z.string().trim().max(80).optional().or(z.literal("")),
});

export type EmployeeSchema = z.infer<typeof employeeSchema>;
