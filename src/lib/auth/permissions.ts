import { redirect } from "next/navigation";

import type { AppRole } from "@/lib/types/app";

export function hasAnyRole(currentRole: AppRole, allowedRoles: AppRole[]) {
  return allowedRoles.includes(currentRole);
}

export function assertRoleAccess(currentRole: AppRole, allowedRoles: AppRole[]) {
  if (!hasAnyRole(currentRole, allowedRoles)) {
    redirect("/dashboard?denied=1");
  }
}
