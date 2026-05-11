import { NextResponse } from "next/server";

import { requireApiAuth } from "@/lib/auth/api";
import { serviceSchema } from "@/lib/schemas/service";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiAuth(["owner"]);

  if (auth instanceof NextResponse) {
    return auth;
  }

  const { id } = await params;
  const body = await request.json();
  const parsed = serviceSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: parsed.error.issues[0]?.message ?? "Data layanan tidak valid.",
      },
      { status: 400 },
    );
  }

  const { data, error } = await auth.supabase
    .from("services")
    .update({
      business_id: parsed.data.businessId,
      description: parsed.data.description || null,
      duration_minutes: parsed.data.durationMinutes ?? null,
      is_active: parsed.data.isActive ?? true,
      name: parsed.data.name,
      price: parsed.data.price,
    })
    .eq("id", id)
    .eq("business_id", parsed.data.businessId)
    .select("*")
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      {
        error: error.message,
      },
      { status: 400 },
    );
  }

  if (!data) {
    return NextResponse.json(
      {
        error: "Layanan tidak ditemukan.",
      },
      { status: 404 },
    );
  }

  return NextResponse.json({ data });
}
