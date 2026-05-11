import { EmptyState } from "@/components/ui/empty-state";
import { requireAuthenticatedProfile } from "@/lib/auth/session";
import { getTransactionFormOptions } from "@/lib/data/transactions";

import { TransactionForm } from "@/components/transactions/transaction-form";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function NewTransactionPage() {
  const session = await requireAuthenticatedProfile();
  const { employees, services, products } = await getTransactionFormOptions(
    session.selectedBusiness.id,
    session.selectedBusiness.slug,
  );

  const supabase = await createSupabaseServerClient();
  const { data: settings } = await supabase
    .from("business_settings")
    .select("tax_percentage, service_charge_percentage")
    .eq("business_id", session.selectedBusiness.id)
    .single();

  const taxPercentage = settings?.tax_percentage ?? 0;
  const serviceChargePercentage = settings?.service_charge_percentage ?? 0;

  return (
    <>
      <section className="page-title">
        <span className="theme-pill w-fit">{session.selectedBusiness.name}</span>
        <h1>Buat transaksi baru</h1>
        <p>
          Setiap layanan akan menyimpan snapshot harga, nama karyawan, dan komisi pada saat
          transaksi disimpan.
        </p>
      </section>
      {services.length || products.length ? (
        <TransactionForm
          key={session.selectedBusiness.id}
          businessId={session.selectedBusiness.id}
          businessSlug={session.selectedBusiness.slug}
          canViewCommission={session.profile.role === "owner"}
          employees={employees}
          services={services}
          products={products}
          taxPercentage={taxPercentage}
          serviceChargePercentage={serviceChargePercentage}
        />
      ) : (
        <EmptyState
          description="Pastikan layanan aktif dan karyawan aktif sudah tersedia sebelum membuat transaksi."
          title="Data master belum lengkap"
        />
      )}
    </>
  );
}
