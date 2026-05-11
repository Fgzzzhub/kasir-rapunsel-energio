import { z } from "zod";

export const serviceSchema = z.object({
  businessId: z.string().uuid(),
  description: z.string().max(400).optional().or(z.literal("")),
  durationMinutes: z.coerce.number().int().positive().max(600).optional().nullable(),
  isActive: z.boolean().optional(),
  name: z.string().trim().min(2, "Nama layanan minimal 2 karakter."),
  price: z.coerce.number().positive("Harga layanan harus lebih dari nol."),
});

export type ServiceSchema = z.infer<typeof serviceSchema>;
