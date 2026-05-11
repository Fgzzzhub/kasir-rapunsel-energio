"use client";

import { LoaderCircle } from "lucide-react";

import { cn } from "@/lib/utils/cn";

import { useBusinessContext } from "./business-provider";

export function BusinessSwitcher() {
  const { businesses, isPending, selectedBusiness, switchBusiness } = useBusinessContext();

  return (
    <div className="inline-flex rounded-xl border border-[color:var(--border)] bg-[var(--surface-muted)] p-1">
      {businesses.map((business) => {
        const isActive = selectedBusiness.slug === business.slug;

        return (
          <button
            key={business.id}
            className={cn(
              "inline-flex min-h-10 items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all",
              isActive
                ? "bg-[var(--accent)] text-[var(--accent-foreground)] shadow-md shadow-[var(--accent-glow)]"
                : "text-muted-foreground hover:bg-[var(--surface-hover)] hover:text-foreground",
            )}
            disabled={isPending}
            onClick={() => void switchBusiness(business.slug)}
            type="button"
          >
            <span>{business.name}</span>
            {isPending && isActive ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
          </button>
        );
      })}
    </div>
  );
}
