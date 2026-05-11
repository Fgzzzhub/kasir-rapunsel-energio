import Link from "next/link";

import { ReportExportButtons } from "@/components/reports/report-export-buttons";
import { DateRangeFilter } from "@/components/ui/date-range-filter";
import { DataTable } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { RupiahFormatter } from "@/components/ui/rupiah-formatter";
import { Select } from "@/components/ui/select";
import { PAYMENT_METHOD_OPTIONS } from "@/lib/constants/app";
import type { AppRole, EmployeeRow, TransactionListItem } from "@/lib/types/app";
import { formatDateTime } from "@/lib/utils/date";
import { getServiceEmployeeNames } from "@/lib/utils/transaction-services";

import { Button } from "../ui/button";

export function TransactionHistory({
  employees,
  filters,
  role,
  selectedBusinessId,
  selectedBusinessName,
  transactions,
}: {
  employees: EmployeeRow[];
  filters: Record<string, string | undefined>;
  role: AppRole;
  selectedBusinessId: string;
  selectedBusinessName: string;
  transactions: TransactionListItem[];
}) {
  const exportParams = new URLSearchParams({
    businessId: selectedBusinessId,
    businessName: selectedBusinessName,
    scope: filters.scope ?? "selected",
  });

  if (filters.employeeId) {
    exportParams.set("employeeId", filters.employeeId);
  }

  if (filters.endDate) {
    exportParams.set("endDate", filters.endDate);
  }

  if (filters.paymentMethod) {
    exportParams.set("paymentMethod", filters.paymentMethod);
  }

  if (filters.search) {
    exportParams.set("search", filters.search);
  }

  if (filters.startDate) {
    exportParams.set("startDate", filters.startDate);
  }

  return (
    <div className="space-y-6">
      <form className="theme-card grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-5">
        <div className="form-field xl:col-span-2">
          <label className="form-label" htmlFor="search">
            Cari pelanggan
          </label>
          <Input
            defaultValue={filters.search}
            id="search"
            name="search"
            placeholder="Nama pelanggan"
          />
        </div>
        <div className="form-field">
          <label className="form-label" htmlFor="paymentMethod">
            Pembayaran
          </label>
          <Select defaultValue={filters.paymentMethod} id="paymentMethod" name="paymentMethod">
            <option value="">Semua metode</option>
            {PAYMENT_METHOD_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="form-field">
          <label className="form-label" htmlFor="employeeId">
            Karyawan
          </label>
          <Select defaultValue={filters.employeeId} id="employeeId" name="employeeId">
            <option value="">Semua karyawan</option>
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.name}
              </option>
            ))}
          </Select>
        </div>
        {role === "owner" ? (
          <div className="form-field">
            <label className="form-label" htmlFor="scope">
              Scope
            </label>
            <Select defaultValue={filters.scope ?? "selected"} id="scope" name="scope">
              <option value="selected">Bisnis terpilih</option>
              <option value="combined">Gabungan dua bisnis</option>
            </Select>
          </div>
        ) : null}
        <div className={role === "owner" ? "xl:col-span-4" : "xl:col-span-5"}>
          <DateRangeFilter endDate={filters.endDate} startDate={filters.startDate} />
        </div>
        <div className="flex flex-wrap items-end gap-3 w-full">
          <Button type="submit" className="flex-1 sm:flex-none">Terapkan filter</Button>
          <Link href="/transactions">
            <Button variant="secondary" className="flex-1 sm:flex-none">
              Reset
            </Button>
          </Link>
        </div>
      </form>

      <div className="flex flex-wrap justify-end gap-3">
        <ReportExportButtons
          actions={[
            {
              href: `/api/exports/transactions?${exportParams.toString()}`,
              label: "Export Excel",
            },
          ]}
        />
        <Link href="/transactions/new">
          <Button>Transaksi baru</Button>
        </Link>
      </div>

      <DataTable
        columns={[
          {
            key: "created_at",
            label: "Tanggal",
            render: (transaction) => (
              <div className="space-y-1">
                <p className="font-semibold text-foreground">{formatDateTime(transaction.created_at)}</p>
                <p className="text-xs text-muted-foreground">
                  {transaction.business?.name ?? "Bisnis tidak diketahui"}
                </p>
              </div>
            ),
          },
          {
            key: "customer_name",
            label: "Pelanggan",
            render: (transaction) => (
              <div className="space-y-1">
                <p className="font-semibold text-foreground">{transaction.customer_name}</p>
                <p className="text-xs text-muted-foreground">
                  {transaction.customer_phone || "Tanpa nomor telepon"}
                </p>
              </div>
            ),
          },
          {
            key: "transaction_services",
            label: "Layanan",
            render: (transaction) => (
              <div className="space-y-2">
                {transaction.transaction_services.map((service) => (
                  <div key={service.id} className="text-xs leading-5 text-muted-foreground">
                    <p className="font-semibold text-foreground">{service.service_name_snapshot}</p>
                    <p>{getServiceEmployeeNames(service)}</p>
                  </div>
                ))}
              </div>
            ),
          },
          {
            key: "payment_method",
            label: "Pembayaran",
            render: (transaction) => transaction.payment_method.toUpperCase(),
          },
          {
            align: "right",
            key: "total_amount",
            label: "Total",
            render: (transaction) => <RupiahFormatter value={transaction.total_amount} />,
          },
          ...(role === "owner"
            ? [
                {
                  align: "right" as const,
                  key: "total_commission",
                  label: "Komisi",
                  render: (transaction: TransactionListItem) => (
                    <span className="text-[var(--gold)]">
                      <RupiahFormatter value={transaction.total_commission} />
                    </span>
                  ),
                },
              ]
            : []),
          {
            key: "actions",
            label: "Aksi",
            render: (transaction) => (
              <Link className="font-semibold text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors" href={`/transactions/${transaction.id}`}>
                Lihat detail
              </Link>
            ),
          },
        ]}
        emptyMessage="Belum ada transaksi pada filter yang dipilih."
        rowKey={(transaction) => transaction.id}
        rows={transactions}
      />
    </div>
  );
}
