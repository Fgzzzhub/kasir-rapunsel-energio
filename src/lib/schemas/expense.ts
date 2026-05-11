import { z } from "zod";

export const expenseSchema = z.object({
  amount: z.coerce.number().positive("Nominal pengeluaran harus lebih dari nol."),
  businessId: z.string().uuid("Bisnis wajib dipilih."),
  category: z.enum(
    [
      "rent",
      "electricity",
      "water",
      "salary",
      "supplies",
      "maintenance",
      "operational",
      "other",
    ],
    {
      message: "Kategori pengeluaran wajib dipilih.",
    },
  ),
  expenseDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal pengeluaran wajib diisi."),
  name: z.string().trim().min(2, "Nama pengeluaran wajib diisi."),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});

export type ExpenseSchema = z.infer<typeof expenseSchema>;
