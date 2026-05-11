import type { ReactNode } from "react";

import type { AppRole } from "@/lib/types/app";

export function RoleGuard({
  allowedRoles,
  children,
  currentRole,
  fallback = null,
}: {
  allowedRoles: AppRole[];
  children: ReactNode;
  currentRole: AppRole;
  fallback?: ReactNode;
}) {
  if (!allowedRoles.includes(currentRole)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
