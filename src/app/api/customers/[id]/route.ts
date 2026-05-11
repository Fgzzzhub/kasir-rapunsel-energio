import { NextResponse } from "next/server";
import { z } from "zod";

import { requireApiAuth } from "@/lib/auth/api";

const customerUpdateSchema = z.object({
  name: z.string().trim().min(1, "Nama customer wajib diisi."),
  notes: z.string().trim().optional(),
  phone: z.string().trim().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiAuth(["owner", "admin"]);

  if (auth instanceof NextResponse) {
    return auth;
  }

  const { id } = await params;
  const parsed = customerUpdateSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Data customer tidak valid." },
      { status: 400 },
    );
  }

  const phone = parsed.data.phone ? parsed.data.phone : null;

  if (phone) {
    const { data: existing, error: existingError } = await auth.supabase
      .from("customers")
      .select("id")
      .eq("phone", phone)
      .neq("id", id)
      .maybeSingle();

    if (existingError) {
      return NextResponse.json({ error: "Gagal memeriksa nomor telepon." }, { status: 500 });
    }

    if (existing) {
      return NextResponse.json(
        { error: "Nomor telepon sudah digunakan customer lain." },
        { status: 409 },
      );
    }
  }

  const { error } = await auth.supabase
    .from("customers")
    .update({
      name: parsed.data.name,
      notes: parsed.data.notes || null,
      phone,
    })
    .eq("id", id);

  if (error) {
    const isUniqueError = error.code === "23505";
    return NextResponse.json(
      { error: isUniqueError ? "Nomor telepon sudah digunakan customer lain." : error.message },
      { status: isUniqueError ? 409 : 400 },
    );
  }

  return NextResponse.json({ data: { id } });
}
