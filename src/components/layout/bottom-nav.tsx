"use client";

import {
  LayoutDashboard,
  Receipt,
  Menu,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { APP_NAVIGATION } from "@/lib/constants/app";
import type { AppRole } from "@/lib/types/app";
import { cn } from "@/lib/utils/cn";

import { MoreMenuDrawer } from "./more-menu-drawer";

const BOTTOM_ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  Receipt,
};

export function BottomNav({ role }: { role: AppRole }) {
  const pathname = usePathname();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const visibleItems = APP_NAVIGATION.filter((item) => item.roles.includes(role));
  
  // Show only Dashboard, Transaksi in the bottom bar
  const bottomBarItems = visibleItems.filter((item) => 
    ["/dashboard", "/transactions"].includes(item.href)
  );

  return (
    <>
      <div className="no-print fixed inset-x-0 bottom-0 z-30 border-t border-[color:var(--border)] bg-[var(--background)]/90 px-3 py-2 backdrop-blur-xl xl:hidden">
        <nav
          className={cn(
            "grid gap-1",
            `grid-cols-${bottomBarItems.length + 1}`
          )}
        >
          {bottomBarItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            const IconComponent = BOTTOM_ICON_MAP[item.icon];
            return (
              <Link
                key={item.href}
                className={cn(
                  "relative flex min-h-12 flex-col items-center justify-center rounded-xl px-2 text-center text-[10px] font-semibold transition-all",
                  isActive
                    ? "text-[var(--accent)]"
                    : "text-muted-foreground hover:text-foreground-secondary"
                )}
                href={item.href}
              >
                {isActive && (
                  <span className="absolute top-1 h-[3px] w-6 rounded-full bg-[var(--accent)]" />
                )}
                {IconComponent ? (
                  <IconComponent className="mb-0.5 h-5 w-5" />
                ) : null}
                {item.label}
              </Link>
            );
          })}
          
          <button
            className={cn(
              "flex min-h-12 flex-col items-center justify-center rounded-xl px-2 text-center text-[10px] font-semibold transition-all",
              isDrawerOpen
                ? "text-[var(--accent)]"
                : "text-muted-foreground hover:text-foreground-secondary"
            )}
            onClick={() => setIsDrawerOpen(true)}
            type="button"
          >
            <Menu className="mb-0.5 h-5 w-5" />
            Menu
          </button>
        </nav>
      </div>
      
      <MoreMenuDrawer 
        isOpen={isDrawerOpen} 
        onClose={() => setIsDrawerOpen(false)} 
        role={role} 
      />
    </>
  );
}
