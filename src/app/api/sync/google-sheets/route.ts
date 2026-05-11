import { NextResponse } from "next/server";

import { requireApiAuth } from "@/lib/auth/api";
import {
  getGoogleSheetsSyncStatus,
  processGoogleSheetsSync,
} from "@/lib/utils/google-sheets";

export async function GET() {
  const auth = await requireApiAuth(["owner"]);

  if (auth instanceof NextResponse) {
    return auth;
  }

  const status = await getGoogleSheetsSyncStatus();

  return NextResponse.json(status);
}

export async function POST(request: Request) {
  const auth = await requireApiAuth(["owner"]);

  if (auth instanceof NextResponse) {
    return auth;
  }

  const body = ((await request.json().catch(() => ({}))) ?? {}) as {
    includeFailed?: boolean;
    limit?: number;
  };
  try {
    const result = await processGoogleSheetsSync({
      includeFailed: body.includeFailed ?? false,
      limit: body.limit ?? 25,
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Sinkronisasi Google Sheets gagal dijalankan.",
      },
      { status: 500 },
    );
  }
}
