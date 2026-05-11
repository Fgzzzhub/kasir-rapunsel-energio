import type { ReactNode } from "react";

import type { AuthenticatedSessionContext } from "@/lib/types/app";

import { BusinessProvider } from "../business/business-provider";
import { BottomNav } from "./bottom-nav";
import { Navbar } from "./navbar";
import { Sidebar } from "./sidebar";

export async function AppLayout({
  children,
  session,
}: {
  children: ReactNode;
  session: AuthenticatedSessionContext;
}) {
  return (
    <BusinessProvider
      businesses={session.businesses}
      initialSelectedBusiness={session.selectedBusiness}
    >
      <div className="no-print mx-auto flex w-full max-w-[1600px] gap-6 px-4 pb-28 pt-6 md:px-6 xl:px-8">
        <Sidebar role={session.profile.role} />
        <div className="min-w-0 flex-1">
          <Navbar
            role={session.profile.role}
            userLabel={session.profile.name ?? session.user.email ?? "Pengguna"}
          />
          <main className="page-grid">{children}</main>
        </div>
      </div>
      <BottomNav role={session.profile.role} />
    </BusinessProvider>
  );
}
