"use client";

import {
  LayoutDashboard,
  Receipt,
  Users,
  CalendarCheck,
  Scissors,
  Package,
  UserCog,
  Wallet,
  BadgeDollarSign,
  BarChart3,
  Settings,
  Warehouse,
  Lock,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useBusinessContext } from "@/components/business/business-provider";
import { APP_NAVIGATION } from "@/lib/constants/app";
import type { AppRole } from "@/lib/types/app";
import { cn } from "@/lib/utils/cn";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  Receipt,
  Users,
  CalendarCheck,
  Scissors,
  Package,
  UserCog,
  Wallet,
  BadgeDollarSign,
  BarChart3,
  Settings,
  Warehouse,
  Lock,
};

export function Sidebar({ role }: { role: AppRole }) {
  const pathname = usePathname();
  const { selectedBusiness } = useBusinessContext();

  const visibleItems = APP_NAVIGATION.filter((item) => {
    const roleMatches = item.roles.includes(role);
    const businessMatches = !item.businesses || item.businesses.includes(selectedBusiness.slug);
    return roleMatches && businessMatches;
  });

  return (
    <aside className="hidden w-64 shrink-0 xl:block">
      <div className="theme-card sticky top-6 p-3">
        <div className="mb-3 px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
            Navigasi
          </p>
        </div>
        <nav className="space-y-0.5">
          {visibleItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            const IconComponent = ICON_MAP[item.icon];

            return (
              <Link
                key={item.href}
                className={cn(
                  "group relative flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-all",
                  isActive
                    ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                    : "text-muted-foreground hover:bg-[var(--surface-hover)] hover:text-foreground",
                )}
                href={item.href}
              >
                {isActive && (
                  <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-[var(--accent)]" />
                )}
                {IconComponent ? (
                  <IconComponent
                    className={cn(
                      "h-4 w-4 shrink-0",
                      isActive ? "text-[var(--accent)]" : "text-muted-foreground group-hover:text-foreground-secondary"
                    )}
                  />
                ) : null}
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
