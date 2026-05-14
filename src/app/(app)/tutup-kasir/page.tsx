import { Lock } from "lucide-react";
import { requireAuthenticatedProfile } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { TutupKasirForm } from "@/components/tutup-kasir/tutup-kasir-form";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { RupiahFormatter } from "@/components/ui/rupiah-formatter";
import { formatDateShort } from "@/lib/utils/date";

export default async function TutupKasirPage() {
  const session = await requireAuthenticatedProfile();
  const supabase = await createSupabaseServerClient();
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' }); // YYYY-MM-DD

  // Call the RPC
  const { data: expectedCash } = await supabase
    .rpc("get_expected_cash" as any, {
      p_business_id: session.selectedBusiness.id,
      p_date: today,
    });

  const { data: pastRecaps } = await supabase
    .from("shift_recaps" as any)
    .select("*, profiles(name)")
    .eq("business_id", session.selectedBusiness.id)
    .order("created_at", { ascending: false })
    .limit(5);

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <section className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight flex items-center gap-3">
          <Lock className="h-8 w-8 text-[var(--accent)]" />
          Tutup Kasir
        </h1>
        <p className="text-muted-foreground">
          Rekap pendapatan hari ini dan cocokkan uang laci fisik sebelum menutup shift.
        </p>
      </section>

      <TutupKasirForm 
        businessId={session.selectedBusiness.id}
        profileId={session.profile.id}
        expectedCash={Number(expectedCash ?? 0)}
      />

      <Card>
        <CardHeader>
          <CardTitle>Riwayat Rekap Shift (Terbaru)</CardTitle>
          <CardDescription>5 rekap terakhir di cabang ini.</CardDescription>
        </CardHeader>
        <div className="p-0 border-t border-[color:var(--border)]">
          {pastRecaps && pastRecaps.length > 0 ? (
            <div className="divide-y divide-[color:var(--border)]">
              {pastRecaps.map((recap: any) => (
                <div key={recap.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold">{formatDateShort(recap.created_at)}</p>
                    <p className="text-sm text-muted-foreground">Oleh: {recap.profiles?.name || "Kasir"}</p>
                    {recap.notes && (
                      <p className="text-xs text-muted-foreground mt-1 italic">&quot;{recap.notes}&quot;</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm">Aktual: <span className="font-semibold"><RupiahFormatter value={recap.actual_cash} /></span></p>
                    <p className="text-sm mt-0.5">
                      Selisih: 
                      <span className={`ml-1 font-bold ${recap.variance === 0 ? "text-emerald-400" : recap.variance > 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        {recap.variance > 0 ? "+" : ""}<RupiahFormatter value={recap.variance} />
                      </span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-muted-foreground text-sm">
              Belum ada riwayat rekap shift.
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
