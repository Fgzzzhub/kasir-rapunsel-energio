import { PayrollManager } from "@/components/payroll/payroll-manager";
import { assertRoleAccess } from "@/lib/auth/permissions";
import { requireAuthenticatedProfile } from "@/lib/auth/session";
import { getEmployees } from "@/lib/data/employees";
import { getPayrollReport } from "@/lib/data/payroll";
import { getMonthRangeFromInput } from "@/lib/utils/date";

export default async function PayrollPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireAuthenticatedProfile();
  assertRoleAccess(session.profile.role, ["owner"]);
  const params = await searchParams;
  const monthRange = getMonthRangeFromInput();
  const filters = {
    endDate:
      typeof params.endDate === "string" && params.endDate
        ? params.endDate
        : monthRange.endDate,
    scope: params.scope === "combined" ? "combined" : "selected",
    startDate:
      typeof params.startDate === "string" && params.startDate
        ? params.startDate
        : monthRange.startDate,
  } as const;
  const [employees, payroll] = await Promise.all([
    getEmployees({
      businessId: session.selectedBusiness.id,
      role: session.profile.role,
      scope: filters.scope,
    }),
    getPayrollReport({
      businessId: session.selectedBusiness.id,
      businessName: session.selectedBusiness.name,
      endDate: filters.endDate,
      role: session.profile.role,
      scope: filters.scope,
      startDate: filters.startDate,
    }),
  ]);

  return (
    <>
      <section className="page-title">
        <span className="theme-pill w-fit">
          {filters.scope === "combined" ? "Semua bisnis" : session.selectedBusiness.name}
        </span>
        <h1>Payroll dinamis</h1>
        <p>
          Gaji bersih dihitung dari gaji pokok, komisi transaksi, bonus, dan potongan tanpa
          menyimpan payroll sebagai data tetap.
        </p>
      </section>
      <PayrollManager
        businesses={session.businesses}
        employees={employees}
        filters={filters}
        payroll={payroll}
        selectedBusinessId={session.selectedBusiness.id}
        selectedBusinessName={session.selectedBusiness.name}
      />
    </>
  );
}
