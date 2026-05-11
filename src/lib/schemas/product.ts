import { z } from "zod";

export const productSchema = z.object({
  businessId: z.string().uuid("Bisnis wajib dipilih."),
  name: z.string().trim().min(3, "Nama produk minimal 3 karakter.").max(100, "Maksimal 100 karakter."),
  category: z.string().trim().max(50).optional().or(z.literal("")),
  sku: z.string().trim().max(50).optional().or(z.literal("")),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  price: z.coerce.number().min(0, "Harga produk minimal 0."),
  costPrice: z.coerce.number().min(0).default(0),
  isActive: z.boolean().default(true),
  trackStock: z.boolean().default(false),
  minimumStock: z.coerce.number().int().min(0).default(5),
  initialStock: z.coerce.number().int().min(0).default(0),
});

export type ProductSchema = z.infer<typeof productSchema>;
