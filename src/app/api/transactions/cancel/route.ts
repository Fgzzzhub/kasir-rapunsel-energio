import { NextResponse } from "next/server";

import { requireApiAuth } from "@/lib/auth/api";

export async function POST(request: Request) {
  const auth = await requireApiAuth(["owner"]);

  if (auth instanceof NextResponse) {
    return auth;
  }

  const body = (await request.json()) as {
    reason?: string;
    transactionId?: string;
  };

  if (!body.transactionId) {
    return NextResponse.json(
      { error: "ID transaksi wajib diisi." },
      { status: 400 },
    );
  }

  const { data, error } = await auth.supabase.rpc("cancel_transaction", {
    p_transaction_id: body.transactionId,
    p_cancelled_by: auth.user.id,
    p_reason: body.reason || null,
  });

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 400 },
    );
  }

  return NextResponse.json({ data });
}
