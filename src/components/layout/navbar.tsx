"use client";

import { ShieldCheck, Wifi, WifiOff } from "lucide-react";
import { useEffect, useState } from "react";

import { BusinessSwitcher } from "@/components/business/business-switcher";
import { useBusinessContext } from "@/components/business/business-provider";
import { Badge } from "@/components/ui/badge";
import { APP_NAME } from "@/lib/constants/app";
import type { AppRole } from "@/lib/types/app";

import { SignOutForm } from "./sign-out-form";
import { ThemeToggle } from "../theme-toggle";

export function Navbar({
  role,
  userLabel,
}: {
  role: AppRole;
  userLabel: string;
}) {
  const { selectedBusiness } = useBusinessContext();
  const [isOnline, setIsOnline] = useState(
    () => typeof window === "undefined" || window.navigator.onLine,
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <header className="theme-card mb-6 flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--accent)] to-[var(--accent-hover)] text-lg font-bold text-[var(--accent-foreground)] shadow-lg shadow-[var(--accent-glow)]">
            RE
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
              {APP_NAME}
            </p>
            <p className="text-lg font-semibold text-foreground">{selectedBusiness.name}</p>
          </div>
        </div>
        <BusinessSwitcher />
      </div>
      <div className="flex flex-col items-start gap-3 md:items-end">
        <div className="flex flex-wrap items-center gap-2">
          {/* Connection status */}
          <Badge tone={isOnline ? "success" : "warning"} className="gap-1.5">
            {isOnline ? (
              <Wifi className="h-3 w-3" />
            ) : (
              <WifiOff className="h-3 w-3" />
            )}
            {isOnline ? "Online" : "Offline"}
          </Badge>
          <Badge tone="accent">{role === "owner" ? "Owner" : "Admin"}</Badge>
          <Badge tone="neutral">
            <ShieldCheck className="mr-1 h-3.5 w-3.5" />
            {userLabel}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <SignOutForm />
        </div>
      </div>
    </header>
  );
}
