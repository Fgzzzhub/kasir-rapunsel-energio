import { NextResponse } from "next/server";

import { hasSupabaseEnv } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AppProfile, AppRole } from "@/lib/types/app";

type ApiAuthContext = {
  profile: AppProfile;
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  user: {
    email?: string;
    id: string;
  };
};

export async function requireApiAuth(allowedRoles?: AppRole[]) {
  if (!hasSupabaseEnv()) {
    return NextResponse.json(
      {
        error: "Supabase belum dikonfigurasi.",
      },
      { status: 503 },
    );
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      {
        error: "Sesi login tidak ditemukan.",
      },
      { status: 401 },
    );
  }

  const { data: profileData } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (!profileData || !profileData.is_active) {
    return NextResponse.json(
      {
        error: "Profil pengguna tidak aktif.",
      },
      { status: 403 },
    );
  }

  const profile = {
    ...profileData,
    role: profileData.role === "owner" ? "owner" : "admin",
  } as AppProfile;

  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    return NextResponse.json(
      {
        error: "Anda tidak memiliki akses untuk tindakan ini.",
      },
      { status: 403 },
    );
  }

  return {
    profile,
    supabase,
    user: {
      email: user.email,
      id: user.id,
    },
  } satisfies ApiAuthContext;
}
