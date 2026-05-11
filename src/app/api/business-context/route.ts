import { NextResponse } from "next/server";

import { BUSINESS_COOKIE_NAME } from "@/lib/constants/app";
import { resolveBusinessSlug } from "@/lib/utils/theme";

export async function POST(request: Request) {
  const body = (await request.json()) as { slug?: string };
  const slug = resolveBusinessSlug(body.slug);
  const response = NextResponse.json({ ok: true, slug });

  response.cookies.set(BUSINESS_COOKIE_NAME, slug, {
    httpOnly: false,
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
    sameSite: "lax",
  });

  return response;
}
