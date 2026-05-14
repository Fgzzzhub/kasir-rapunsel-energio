"use client";

import {
  X,
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
import { useEffect, useState } from "react";

import { BusinessSwitcher } from "@/components/business/business-switcher";
import { useBusinessContext } from "@/components/business/business-provider";
import { SignOutForm } from "@/components/layout/sign-out-form";
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

type MoreMenuDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
  role: AppRole;
};

export function MoreMenuDrawer({ isOpen, onClose, role }: MoreMenuDrawerProps) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const { selectedBusiness } = useBusinessContext();

  useEffect(() => {
    setTimeout(() => setMounted(true), 0);
  }, []);

  // Prevent background scrolling when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isOpen]);

  if (!mounted) return null;

  const visibleItems = APP_NAVIGATION.filter((item) => {
    const roleMatches = item.roles.includes(role);
    const businessMatches = !item.businesses || item.businesses.includes(selectedBusiness.slug);
    return roleMatches && businessMatches;
  });
  
  // Show all items in drawer except Dashboard and Transaksi which are already in bottom nav
  const drawerItems = visibleItems.filter(
    (item) => !["/dashboard", "/transactions"].includes(item.href)
  );

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "no-print fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-300 xl:hidden",
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={cn(
          "no-print fixed inset-x-0 bottom-0 z-50 flex max-h-[85vh] flex-col rounded-t-2xl shadow-2xl transition-transform duration-300 ease-in-out xl:hidden",
          "bg-[var(--background-subtle)] border-t border-[color:var(--border-strong)]",
          isOpen ? "translate-y-0" : "translate-y-full"
        )}
      >
        <div className="flex items-center justify-between border-b border-[color:var(--border)] px-6 py-4">
          <h2 className="text-lg font-semibold text-foreground">Menu Lainnya</h2>
          <button
            className="rounded-full p-2 text-muted-foreground hover:bg-[var(--surface-hover)] transition-colors"
            onClick={onClose}
            type="button"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="mb-6 space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Bisnis</h3>
            <BusinessSwitcher />
          </div>

          <div className="mb-6 space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Navigasi</h3>
            <nav className="grid gap-1">
              {drawerItems.map((item) => {
                const isActive = pathname.startsWith(item.href);
                const IconComponent = ICON_MAP[item.icon];
                return (
                  <Link
                    key={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                        : "text-foreground-secondary hover:bg-[var(--surface-hover)] hover:text-foreground"
                    )}
                    href={item.href}
                    onClick={onClose}
                  >
                    {IconComponent ? (
                      <IconComponent className={cn("h-4 w-4 shrink-0", isActive ? "text-[var(--accent)]" : "text-muted-foreground")} />
                    ) : null}
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          
          <div className="mb-4 space-y-4 border-t border-[color:var(--border)] pt-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Akun</h3>
            <SignOutForm />
          </div>
        </div>
      </div>
    </>
  );
}
