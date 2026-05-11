import { z } from "zod";

export const transactionSchema = z.object({
  businessId: z.string().uuid(),
  customerName: z.string().trim().min(2, "Nama pelanggan wajib diisi."),
  customerPhone: z.string().trim().max(30).optional().or(z.literal("")),
  services: z
    .array(
      z.object({
        employeeIds: z
          .array(z.string().uuid("Karyawan wajib dipilih."))
          .min(1, "Pilih minimal satu karyawan untuk layanan ini.")
          .refine(
            (employeeIds) => new Set(employeeIds).size === employeeIds.length,
            "Karyawan tidak boleh duplikat.",
          ),
        serviceId: z.string().uuid("Layanan wajib dipilih."),
        finalPrice: z.number().min(1, "Harga layanan harus lebih dari 0.").optional().nullable(),
        priceAdjustmentReason: z.string().trim().max(200).optional().nullable().or(z.literal("")),
      }),
    )
    .default([]),
  products: z
    .array(
      z.object({
        productId: z.string().uuid("Produk wajib dipilih."),
        qty: z.number().min(1, "Kuantitas minimal 1."),
      }),
    )
    .default([]),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
  paymentMethod: z.enum(["cash", "transfer", "qris", "other"], {
    message: "Metode pembayaran wajib dipilih.",
  }),
  taxAmount: z.number().default(0),
  serviceChargeAmount: z.number().default(0),
}).refine(data => data.services.length > 0 || data.products.length > 0, {
  message: "Minimal satu layanan atau produk harus dipilih.",
  path: ["services"]
});

export type TransactionSchema = z.infer<typeof transactionSchema>;
