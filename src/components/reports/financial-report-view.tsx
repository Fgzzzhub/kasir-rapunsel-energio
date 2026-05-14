import Link from "next/link";

import { ReportExportButtons } from "@/components/reports/report-export-buttons";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { RupiahFormatter } from "@/components/ui/rupiah-formatter";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { FinancialReportData } from "@/lib/types/app";
import { formatDateLong } from "@/lib/utils/date";

export function FinancialReportView({
  businessId,
  businessName,
  filters,
  report,
}: {
  businessId: string;
  businessName: string;
  filters: {
    date: string;
    endDate: string;
    month: string;
    preset: "custom" | "daily" | "monthly";
    scope: "selected" | "combined";
    startDate: string;
  };
  report: FinancialReportData;
}) {
  const exportParams = new URLSearchParams({
    businessId,
    businessName,
    date: filters.date,
    endDate: filters.endDate,
    month: filters.month,
    preset: filters.preset,
    scope: filters.scope,
    startDate: filters.startDate,
  }).toString();
  const hasReportData = Boolean(report.transactions.length || report.expenses.length);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="px-0">
          <CardTitle>Filter laporan</CardTitle>
          <CardDescription>
            Pilih laporan harian, bulanan, atau rentang tanggal khusus tanpa mengubah data
            historis transaksi.
          </CardDescription>
        </CardHeader>
        <form className="grid gap-4 lg:grid-cols-[0.8fr_0.8fr_0.8fr_1fr_1fr_auto]">
          <div className="form-field">
            <label className="form-label" htmlFor="reportScope">
              Scope bisnis
            </label>
            <Select defaultValue={filters.scope} name="scope">
              <SelectTrigger id="reportScope" className="w-full">
                <SelectValue placeholder="Scope bisnis" />
              </SelectTrigger>
              <SelectContent className="z-50">
                <SelectItem value="selected">{businessName}</SelectItem>
                <SelectItem value="combined">Semua bisnis</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="form-field">
            <label className="form-label" htmlFor="reportPreset">
              Mode laporan
            </label>
            <Select defaultValue={filters.preset} name="preset">
              <SelectTrigger id="reportPreset" className="w-full">
                <SelectValue placeholder="Mode laporan" />
              </SelectTrigger>
              <SelectContent className="z-50">
                <SelectItem value="daily">Harian</SelectItem>
                <SelectItem value="monthly">Bulanan</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="form-field">
            <label className="form-label" htmlFor="reportDate">
              Tanggal harian
            </label>
            <Input defaultValue={filters.date} id="reportDate" name="date" type="date" />
          </div>
          <div className="form-field">
            <label className="form-label" htmlFor="reportMonth">
              Bulan
            </label>
            <Input defaultValue={filters.month} id="reportMonth" name="month" type="month" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="form-field">
              <label className="form-label" htmlFor="reportStartDate">
                Tanggal mulai
              </label>
              <Input
                defaultValue={filters.startDate}
                id="reportStartDate"
                name="startDate"
                type="date"
              />
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="reportEndDate">
                Tanggal akhir
              </label>
              <Input defaultValue={filters.endDate} id="reportEndDate" name="endDate" type="date" />
            </div>
          </div>
          <div className="flex items-end gap-3">
            <Button type="submit">Terapkan</Button>
            <Link
              className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-[color:var(--border)] bg-[var(--surface-hover)] px-4 py-2 text-sm font-semibold"
              href="/reports"
            >
              Reset
            </Link>
          </div>
        </form>
        <div className="mt-4">
          <ReportExportButtons
            actions={[
              { href: `/api/exports/financial?${exportParams}`, label: "Export Excel" },
              {
                href: `/api/exports/financial?${exportParams}&format=pdf`,
                label: "Export PDF",
              },
            ]}
          />
        </div>
      </Card>

      {!hasReportData ? (
        <EmptyState
          description="Belum ada transaksi atau pengeluaran pada periode dan scope bisnis yang sedang dipilih."
          title="Laporan belum memiliki data"
        />
      ) : null}

      {hasReportData ? (
        <>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardHeader className="px-0">
            <CardDescription>Gross revenue</CardDescription>
            <CardTitle>
              <RupiahFormatter value={report.summary.grossRevenue} />
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="px-0">
            <CardDescription>Total transaksi</CardDescription>
            <CardTitle>{report.summary.totalTransactions}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="px-0">
            <CardDescription>Total layanan</CardDescription>
            <CardTitle>{report.summary.totalServicesHandled}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="px-0">
            <CardDescription>Total komisi</CardDescription>
            <CardTitle>
              <RupiahFormatter value={report.summary.totalCommission} />
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="px-0">
            <CardDescription>Total pengeluaran</CardDescription>
            <CardTitle>
              <RupiahFormatter value={report.summary.totalExpenses} />
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="px-0">
            <CardDescription>Estimasi laba bersih</CardDescription>
            <CardTitle>
              <RupiahFormatter value={report.summary.estimatedNetProfit} />
            </CardTitle>
          </CardHeader>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader className="px-0">
            <CardTitle>Breakdown pembayaran</CardTitle>
            <CardDescription>Distribusi transaksi per metode pembayaran.</CardDescription>
          </CardHeader>
          <DataTable
            columns={[
              {
                key: "method",
                label: "Metode",
                render: (row) => row.method.toUpperCase(),
              },
              {
                align: "right",
                key: "totalTransactions",
                label: "Transaksi",
              },
              {
                align: "right",
                key: "totalAmount",
                label: "Total",
                render: (row) => <RupiahFormatter value={row.totalAmount} />,
              },
            ]}
            emptyMessage="Belum ada data pembayaran."
            rowKey={(row) => row.method}
            rows={report.paymentMethodBreakdown}
          />
        </Card>

        <Card>
          <CardHeader className="px-0">
            <CardTitle>Revenue per bisnis</CardTitle>
            <CardDescription>Perbandingan omzet dan jumlah transaksi antar bisnis.</CardDescription>
          </CardHeader>
          <DataTable
            columns={[
              {
                key: "businessName",
                label: "Bisnis",
              },
              {
                align: "right",
                key: "totalTransactions",
                label: "Transaksi",
              },
              {
                align: "right",
                key: "totalRevenue",
                label: "Revenue",
                render: (row) => <RupiahFormatter value={row.totalRevenue} />,
              },
            ]}
            emptyMessage="Belum ada data revenue bisnis."
            rowKey={(row) => row.businessId}
            rows={report.revenueByBusiness}
          />
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader className="px-0">
            <CardTitle>Komisi per karyawan</CardTitle>
            <CardDescription>
              Menggunakan snapshot komisi dari detail layanan pada transaksi historis.
            </CardDescription>
          </CardHeader>
          <DataTable
            columns={[
              {
                key: "employeeName",
                label: "Karyawan",
                render: (row) => (
                  <div className="space-y-1">
                    <p className="font-semibold">{row.employeeName}</p>
                    <p className="text-xs text-muted-foreground">{row.businessName}</p>
                  </div>
                ),
              },
              {
                align: "right",
                key: "handledRevenue",
                label: "Omzet",
                render: (row) => <RupiahFormatter value={row.handledRevenue} />,
              },
              {
                align: "right",
                key: "totalCommission",
                label: "Komisi",
                render: (row) => <RupiahFormatter value={row.totalCommission} />,
              },
            ]}
            emptyMessage="Belum ada komisi pada periode ini."
            rowKey={(row) => `${row.businessId}-${row.employeeId}`}
            rows={report.commissionByEmployee}
          />
        </Card>

        <Card>
          <CardHeader className="px-0">
            <CardTitle>Karyawan teratas</CardTitle>
            <CardDescription>
              Diurutkan berdasarkan omzet tertangani selama periode laporan aktif.
            </CardDescription>
          </CardHeader>
          <DataTable
            columns={[
              {
                key: "employeeName",
                label: "Karyawan",
                render: (row) => (
                  <div className="space-y-1">
                    <p className="font-semibold">{row.employeeName}</p>
                    <p className="text-xs text-muted-foreground">{row.businessName}</p>
                  </div>
                ),
              },
              {
                align: "right",
                key: "handledRevenue",
                label: "Omzet",
                render: (row) => <RupiahFormatter value={row.handledRevenue} />,
              },
              {
                align: "right",
                key: "totalCommission",
                label: "Komisi",
                render: (row) => <RupiahFormatter value={row.totalCommission} />,
              },
            ]}
            emptyMessage="Belum ada data karyawan teratas."
            rowKey={(row) => `${row.businessId}-${row.employeeId}`}
            rows={report.topEmployees}
          />
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader className="px-0">
            <CardTitle>Layanan teratas</CardTitle>
            <CardDescription>Top layanan berdasarkan revenue historis pada periode aktif.</CardDescription>
          </CardHeader>
          <DataTable
            columns={[
              {
                key: "serviceName",
                label: "Layanan",
                render: (row) => (
                  <div className="space-y-1">
                    <p className="font-semibold">{row.serviceName}</p>
                    <p className="text-xs text-muted-foreground">{row.businessName}</p>
                  </div>
                ),
              },
              {
                align: "right",
                key: "totalServices",
                label: "Jumlah",
              },
              {
                align: "right",
                key: "totalRevenue",
                label: "Revenue",
                render: (row) => <RupiahFormatter value={row.totalRevenue} />,
              },
            ]}
            emptyMessage="Belum ada data layanan pada periode ini."
            rowKey={(row) => `${row.businessId}-${row.serviceName}`}
            rows={report.topServices}
          />
        </Card>

        <Card>
          <CardHeader className="px-0">
            <CardTitle>Pengeluaran periode aktif</CardTitle>
            <CardDescription>
              Digunakan untuk menghitung estimasi laba bersih laporan keuangan.
            </CardDescription>
          </CardHeader>
          <DataTable
            columns={[
              {
                key: "expense_date",
                label: "Tanggal",
                render: (row) => formatDateLong(row.expense_date),
              },
              {
                key: "name",
                label: "Pengeluaran",
                render: (row) => (
                  <div className="space-y-1">
                    <p className="font-semibold">{row.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {row.business?.name ?? "Bisnis tidak diketahui"}
                    </p>
                  </div>
                ),
              },
              {
                key: "category",
                label: "Kategori",
                render: (row) => row.category,
              },
              {
                align: "right",
                key: "amount",
                label: "Nominal",
                render: (row) => <RupiahFormatter value={row.amount} />,
              },
            ]}
            emptyMessage="Belum ada pengeluaran pada periode ini."
            rowKey={(row) => row.id}
            rows={report.expenses}
          />
        </Card>
      </section>
        </>
      ) : null}
    </div>
  );
}
