import { FinancialReportView } from "@/components/reports/financial-report-view";
import { assertRoleAccess } from "@/lib/auth/permissions";
import { requireAuthenticatedProfile } from "@/lib/auth/session";
import { getFinancialReport } from "@/lib/data/reports";
import { getMonthInputValue, getPresetRange, getTodayDateValue } from "@/lib/utils/date";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireAuthenticatedProfile();
  assertRoleAccess(session.profile.role, ["owner"]);
  const params = await searchParams;
  const filters = {
    date: typeof params.date === "string" && params.date ? params.date : getTodayDateValue(),
    endDate: typeof params.endDate === "string" ? params.endDate : "",
    month:
      typeof params.month === "string" && params.month ? params.month : getMonthInputValue(),
    preset:
      params.preset === "daily" || params.preset === "custom" ? params.preset : "monthly",
    scope: params.scope === "combined" ? "combined" : "selected",
    startDate: typeof params.startDate === "string" ? params.startDate : "",
  } as const;
  const reportRange = getPresetRange(filters);
  const report = await getFinancialReport({
    businessId: session.selectedBusiness.id,
    businessName: session.selectedBusiness.name,
    endDate: reportRange.endDate,
    role: session.profile.role,
    scope: filters.scope,
    startDate: reportRange.startDate,
  });

  return (
    <>
      <section className="page-title">
        <span className="theme-pill w-fit">
          {filters.scope === "combined" ? "Semua bisnis" : session.selectedBusiness.name}
        </span>
        <h1>Laporan keuangan</h1>
        <p>
          Pantau gross revenue, komisi, pengeluaran, estimasi laba, breakdown pembayaran, dan
          performa layanan secara historis.
        </p>
      </section>
      <FinancialReportView
        businessId={session.selectedBusiness.id}
        businessName={session.selectedBusiness.name}
        filters={{
          ...filters,
          endDate: reportRange.endDate,
          startDate: reportRange.startDate,
        }}
        report={report}
      />
    </>
  );
}
