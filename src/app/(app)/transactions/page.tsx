import { TransactionHistory } from "@/components/transactions/transaction-history";
import { requireAuthenticatedProfile } from "@/lib/auth/session";
import { getEmployees } from "@/lib/data/employees";
import { getTransactions } from "@/lib/data/transactions";

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireAuthenticatedProfile();
  const params = await searchParams;
  const filters = {
    employeeId: typeof params.employeeId === "string" ? params.employeeId : undefined,
    endDate: typeof params.endDate === "string" ? params.endDate : undefined,
    paymentMethod: typeof params.paymentMethod === "string" ? params.paymentMethod : undefined,
    scope:
      session.profile.role === "owner" && params.scope === "combined"
        ? "combined"
        : "selected",
    search: typeof params.search === "string" ? params.search : undefined,
    startDate: typeof params.startDate === "string" ? params.startDate : undefined,
  } as const;

  const [employees, transactions] = await Promise.all([
    getEmployees({
      businessId: session.selectedBusiness.id,
      role: session.profile.role,
      scope: filters.scope,
    }),
    getTransactions({
      businessId: session.selectedBusiness.id,
      employeeId: filters.employeeId,
      endDate: filters.endDate,
      paymentMethod: filters.paymentMethod,
      role: session.profile.role,
      scope: filters.scope,
      search: filters.search,
      startDate: filters.startDate,
    }),
  ]);

  return (
    <>
      <section className="page-title">
        <span className="theme-pill w-fit">
          {filters.scope === "combined" ? "Gabungan dua bisnis" : session.selectedBusiness.name}
        </span>
        <h1>Riwayat transaksi</h1>
        <p>
          Filter histori transaksi berdasarkan tanggal, pelanggan, metode pembayaran, dan
          karyawan.
        </p>
      </section>
      <TransactionHistory
        employees={employees}
        filters={filters}
        role={session.profile.role}
        selectedBusinessId={session.selectedBusiness.id}
        selectedBusinessName={session.selectedBusiness.name}
        transactions={transactions}
      />
    </>
  );
}
