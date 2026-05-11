import type { ReactNode } from "react";

import { AppLayout } from "@/components/layout/app-layout";
import { requireAuthenticatedProfile } from "@/lib/auth/session";

export default async function ProtectedLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const session = await requireAuthenticatedProfile();

  return <AppLayout session={session}>{children}</AppLayout>;
}
