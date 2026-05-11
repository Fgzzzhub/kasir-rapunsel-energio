import { DEFAULT_BUSINESS_SLUG } from "@/lib/constants/app";
import type { AppBusiness, BusinessSlug, BusinessTheme } from "@/lib/types/app";

const KNOWN_BUSINESS_SLUGS: BusinessSlug[] = ["rapunsel-salon", "energio-reflexologi"];

export function getThemeFromBusiness(business?: Pick<AppBusiness, "theme"> | null) {
  return business?.theme === "green" ? "green" : "soft";
}

/**
 * Normalizes a raw DB slug to a known BusinessSlug type.
 * If the slug is already a known value, it's returned as-is.
 * Unknown slugs fall back to DEFAULT_BUSINESS_SLUG so the type system
 * stays sound without silently mapping unrelated slugs.
 */
export function resolveBusinessSlug(slug: string | null | undefined): BusinessSlug {
  if (slug && (KNOWN_BUSINESS_SLUGS as string[]).includes(slug)) {
    return slug as BusinessSlug;
  }
  return DEFAULT_BUSINESS_SLUG;
}

export function getThemeLabel(theme: BusinessTheme) {
  return theme === "green" ? "Energio Reflexologi" : "Rapunsel Salon";
}
