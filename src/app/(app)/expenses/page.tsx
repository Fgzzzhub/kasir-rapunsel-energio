import { ExpenseManager } from "@/components/expenses/expense-manager";
import { assertRoleAccess } from "@/lib/auth/permissions";
import { requireAuthenticatedProfile } from "@/lib/auth/session";
import { getExpenses } from "@/lib/data/expenses";
import { getMonthRangeFromInput, getTodayDateValue } from "@/lib/utils/date";

export default async function ExpensesPage() {
  const session = await requireAuthenticatedProfile();
  assertRoleAccess(session.profile.role, ["owner"]);
  const currentMonthRange = getMonthRangeFromInput();
  const { expenses } = await getExpenses({
    businessId: session.selectedBusiness.id,
    role: session.profile.role,
    scope: "combined",
  });

  return (
    <>
      <section className="page-title">
        <span className="theme-pill w-fit">{session.selectedBusiness.name}</span>
        <h1>Pengeluaran operasional</h1>
        <p>
          Catat biaya sewa, listrik, gaji, perlengkapan, dan kebutuhan operasional lain dengan
          filter per bisnis maupun gabungan.
        </p>
      </section>
      <ExpenseManager
        businesses={session.businesses}
        currentDate={getTodayDateValue()}
        initialEndDate={currentMonthRange.endDate}
        initialExpenses={expenses}
        initialStartDate={currentMonthRange.startDate}
        selectedBusinessId={session.selectedBusiness.id}
        selectedBusinessName={session.selectedBusiness.name}
      />
    </>
  );
}
