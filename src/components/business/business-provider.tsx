"use client";

import {
  createContext,
  startTransition,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";

import { BUSINESS_COOKIE_NAME } from "@/lib/constants/app";
import type { AppBusiness, BusinessTheme } from "@/lib/types/app";

type BusinessContextValue = {
  businesses: AppBusiness[];
  isPending: boolean;
  selectedBusiness: AppBusiness;
  switchBusiness: (slug: AppBusiness["slug"]) => Promise<void>;
  theme: BusinessTheme;
};

const BusinessContext = createContext<BusinessContextValue | null>(null);

export function BusinessProvider({
  businesses,
  children,
  initialSelectedBusiness,
}: {
  businesses: AppBusiness[];
  children: ReactNode;
  initialSelectedBusiness: AppBusiness;
}) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [selectedSlug, setSelectedSlug] = useState(initialSelectedBusiness.slug);
  const selectedBusiness =
    businesses.find((business) => business.slug === selectedSlug) ?? initialSelectedBusiness;

  // Sync selectedSlug when the server-resolved initialSelectedBusiness changes.
  // This handles full-page reloads (e.g. after server-side redirect) so the
  // client state always reflects what the server determined from the cookie.
  useEffect(() => {
    setTimeout(() => setSelectedSlug(initialSelectedBusiness.slug), 0);
  }, [initialSelectedBusiness.slug]);

  useEffect(() => {
    // Always persist the selected business to cookie (so server always has the
    // right value) and update visual theme attributes.
    const maxAge = 60 * 60 * 24 * 365;
    const currentCookie = document.cookie
      .split("; ")
      .find((row) => row.startsWith(`${BUSINESS_COOKIE_NAME}=`))
      ?.split("=")[1];

    if (currentCookie !== selectedBusiness.slug) {
      document.cookie = `${BUSINESS_COOKIE_NAME}=${selectedBusiness.slug}; path=/; max-age=${maxAge}; samesite=lax`;
    }

    window.localStorage.setItem("selected-business-slug", selectedBusiness.slug);
    document.documentElement.dataset.businessTheme = selectedBusiness.theme;
    document.body.dataset.businessTheme = selectedBusiness.theme;
  }, [selectedBusiness]);

  const switchBusiness = async (slug: AppBusiness["slug"]) => {
    const previousSlug = selectedBusiness.slug;
    const nextBusiness =
      businesses.find((business) => business.slug === slug) ?? initialSelectedBusiness;

    setIsPending(true);
    setSelectedSlug(nextBusiness.slug);

    try {
      const maxAge = 60 * 60 * 24 * 365;
      document.cookie = `${BUSINESS_COOKIE_NAME}=${nextBusiness.slug}; path=/; max-age=${maxAge}; samesite=lax`;

      startTransition(() => {
        router.refresh();
      });
    } catch {
      setSelectedSlug(previousSlug);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <BusinessContext.Provider
      value={{
        businesses,
        isPending,
        selectedBusiness,
        switchBusiness,
        theme: selectedBusiness.theme,
      }}
    >
      <div className="app-shell" data-business-theme={selectedBusiness.theme}>
        {children}
      </div>
    </BusinessContext.Provider>
  );
}

export function useBusinessContext() {
  const value = useContext(BusinessContext);

  if (!value) {
    throw new Error("useBusinessContext must be used inside BusinessProvider.");
  }

  return value;
}
