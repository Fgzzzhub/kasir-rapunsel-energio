import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { BUSINESS_COOKIE_NAME, DEFAULT_BUSINESS_SLUG } from "@/lib/constants/app";
import { hasSupabaseEnv } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  AppBusiness,
  AppProfile,
  AuthenticatedSessionContext,
  BusinessTheme,
  SessionContext,
} from "@/lib/types/app";
import { resolveBusinessSlug } from "@/lib/utils/theme";

function getFallbackBusinesses(): AppBusiness[] {
  const now = new Date().toISOString();

  return [
    {
      created_at: now,
      id: "fallback-rapunsel",
      is_active: true,
      name: "Rapunsel Salon",
      slug: "rapunsel-salon",
      theme: "soft",
      updated_at: now,
    },
    {
      created_at: now,
      id: "fallback-energio",
      is_active: true,
      name: "Energio Reflexologi",
      slug: "energio-reflexologi",
      theme: "green",
      updated_at: now,
    },
  ];
}

function resolveSelectedBusiness(
  businesses: AppBusiness[],
  selectedSlug: string | undefined,
) {
  return (
    businesses.find((business) => business.slug === selectedSlug) ??
    businesses.find((business) => business.slug === DEFAULT_BUSINESS_SLUG) ??
    businesses[0]
  );
}

function toTheme(theme?: string | null): BusinessTheme {
  return theme === "green" ? "green" : "soft";
}

export async function getSessionContext(): Promise<SessionContext> {
  const cookieStore = await cookies();
  const selectedSlug = cookieStore.get(BUSINESS_COOKIE_NAME)?.value;

  if (!hasSupabaseEnv()) {
    const businesses = getFallbackBusinesses();
    const selectedBusiness = resolveSelectedBusiness(businesses, selectedSlug);

    return {
      businesses,
      isConfigured: false,
      profile: null,
      selectedBusiness,
      theme: selectedBusiness.theme,
      user: null,
    };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: businessesData } = await supabase
    .from("businesses")
    .select("*")
    .eq("is_active", true)
    .order("name", { ascending: true });

  const businesses: AppBusiness[] = ((businessesData ?? []) as AppBusiness[]).map((business) => ({
    ...business,
    slug: resolveBusinessSlug(business.slug),
    theme: toTheme(business.theme),
  }));

  const selectedBusiness = resolveSelectedBusiness(
    businesses.length ? businesses : getFallbackBusinesses(),
    selectedSlug,
  );

  if (!user) {
    return {
      businesses,
      isConfigured: true,
      profile: null,
      selectedBusiness,
      theme: selectedBusiness.theme,
      user: null,
    };
  }

  const { data: profileData } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  const profile = profileData
    ? ({
        ...profileData,
        role: profileData.role === "owner" ? "owner" : "admin",
      } as AppProfile)
    : null;

  return {
    businesses,
    isConfigured: true,
    profile,
    selectedBusiness,
    theme: selectedBusiness.theme,
    user: {
      email: user.email,
      id: user.id,
    },
  };
}

export async function requireAuthenticatedProfile(): Promise<AuthenticatedSessionContext> {
  const session = await getSessionContext();

  if (!session.isConfigured) {
    redirect("/login?setup=1");
  }

  if (!session.user) {
    redirect("/login");
  }

  if (!session.profile || !session.profile.is_active) {
    redirect("/login?inactive=1");
  }

  return session as AuthenticatedSessionContext;
}
