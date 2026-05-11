import { Users, UserRoundCheck, CalendarDays, Repeat, WalletCards } from "lucide-react";

import { CustomerList } from "@/components/customers/customer-list";
import { StatCard } from "@/components/dashboard/stat-card";
import { BusinessBadge } from "@/components/ui/badge";
import { RupiahFormatter } from "@/components/ui/rupiah-formatter";
import { requireAuthenticatedProfile } from "@/lib/auth/session";
import { getCustomers, type CustomerSort } from "@/lib/data/customers";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireAuthenticatedProfile();
  const params = await searchParams;
  const filters = {
    businessId: typeof params.businessId === "string" ? params.businessId : session.selectedBusiness.id,
    endDate: typeof params.endDate === "string" ? params.endDate : undefined,
    phone: typeof params.phone === "string" ? params.phone : undefined,
    search: typeof params.search === "string" ? params.search : undefined,
    sort: typeof params.sort === "string" ? (params.sort as CustomerSort) : "newest",
    startDate: typeof params.startDate === "string" ? params.startDate : undefined,
  };

  const { customers, metrics } = await getCustomers({
    businessId: session.selectedBusiness.id,
    filters,
    role: session.profile.role,
  });

  const activeBusiness =
    session.profile.role === "owner" && filters.businessId === "all"
      ? null
      : session.businesses.find((business) => business.id === filters.businessId) ??
        session.selectedBusiness;

  return (
    <>
      <section className="page-title">
        <div className="flex flex-wrap items-center gap-2">
          {activeBusiness ? (
            <BusinessBadge name={activeBusiness.name} slug={activeBusiness.slug} />
          ) : (
            <span className="theme-pill w-fit">Semua bisnis</span>
          )}
        </div>
        <h1>Data Customer</h1>
        <p>Kelola dan lihat riwayat pelanggan Rapunsel Salon dan Energio Reflexologi.</p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          caption="Jumlah customer pada filter aktif."
          icon={<Users className="h-5 w-5" />}
          title="Total customer"
          value={metrics.totalCustomers}
        />
        <StatCard
          caption="Customer yang profilnya dibuat bulan ini."
          icon={<UserRoundCheck className="h-5 w-5" />}
          title="Customer baru bulan ini"
          value={metrics.newCustomersThisMonth}
        />
        <StatCard
          caption="Customer yang punya transaksi bulan ini."
          icon={<CalendarDays className="h-5 w-5" />}
          title="Datang bulan ini"
          value={metrics.customersThisMonth}
        />
        <StatCard
          caption="Akumulasi transaksi customer bulan ini."
          icon={<WalletCards className="h-5 w-5" />}
          title="Spending bulan ini"
          value={<RupiahFormatter value={metrics.spendingThisMonth} />}
        />
        <StatCard
          caption="Customer dengan kunjungan lebih dari satu kali."
          icon={<Repeat className="h-5 w-5" />}
          title="Customer repeat"
          value={metrics.repeatCustomers}
        />
      </section>

      <CustomerList
        businesses={session.businesses}
        customers={customers}
        filters={filters}
        role={session.profile.role}
        selectedBusiness={session.selectedBusiness}
      />
    </>
  );
}
