import { Metadata } from "next";
import { SettingsManager } from "@/components/settings/settings-manager";
import { assertRoleAccess } from "@/lib/auth/permissions";
import { requireAuthenticatedProfile } from "@/lib/auth/session";
import { getGoogleSheetsSyncStatus } from "@/lib/utils/google-sheets";

export const metadata: Metadata = {
  title: "Pengaturan | Rapunsel & Energio POS",
  description: "Manajemen pengaturan bisnis dan integrasi.",
};

export default async function SettingsPage() {
  const session = await requireAuthenticatedProfile();
  assertRoleAccess(session.profile.role, ["owner"]);
  
  const sheetsStatus = await getGoogleSheetsSyncStatus();

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-3xl font-bold tracking-tight">Pengaturan</h1>
        <p className="text-muted-foreground">
          Konfigurasi profil bisnis, nota pembayaran, pajak, dan integrasi Google Sheets.
        </p>
      </div>
      
      <SettingsManager 
        businessId={session.selectedBusiness.id} 
        sheetsStatus={sheetsStatus} 
      />
    </div>
  );
}
