"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Ban, Eye, MoreVertical, XCircle } from "lucide-react";

import { ReportExportButtons } from "@/components/reports/report-export-buttons";
import { Badge } from "@/components/ui/badge";
import { DateRangeFilter } from "@/components/ui/date-range-filter";
import { DataTable } from "@/components/ui/data-table";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { RupiahFormatter } from "@/components/ui/rupiah-formatter";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuPortal, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { PAYMENT_METHOD_OPTIONS } from "@/lib/constants/app";
import type { AppRole, EmployeeRow, TransactionListItem } from "@/lib/types/app";
import { formatDateTime } from "@/lib/utils/date";
import { getServiceEmployeeNames } from "@/lib/utils/transaction-services";

import { Button } from "../ui/button";

function TransactionStatusBadge({ status }: { status: string }) {
  if (status === "cancelled" || status === "voided") {
    return <Badge tone="danger">Dibatalkan</Badge>;
  }

  if (status === "refunded") {
    return <Badge tone="warning">Refund</Badge>;
  }

  return null;
}

function isToday(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

function canCancelTransaction(transaction: TransactionListItem, role: AppRole) {
  if (transaction.status === "cancelled" || transaction.status === "voided") {
    return false;
  }

  // Owner can always cancel
  if (role === "owner") {
    return true;
  }

  // Admin can only cancel today's transactions
  return isToday(transaction.created_at);
}

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
  const router = useRouter();
  const [pendingCancel, setPendingCancel] = useState<TransactionListItem | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

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

  async function handleCancelTransaction() {
    if (!pendingCancel) return;

    setIsCancelling(true);
    setCancelError(null);

    try {
      const response = await fetch("/api/transactions/cancel", {
        body: JSON.stringify({
          transactionId: pendingCancel.id,
          reason: cancelReason.trim() || undefined,
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });

      const payload = (await response.json()) as {
        data?: Record<string, unknown>;
        error?: string;
      };

      if (!response.ok || payload.error) {
        setCancelError(payload.error ?? "Gagal membatalkan transaksi.");
        setIsCancelling(false);
        return;
      }

      // Success - close dialog and refresh data
      setPendingCancel(null);
      setCancelReason("");
      setIsCancelling(false);
      router.refresh();
    } catch {
      setCancelError("Terjadi kesalahan jaringan.");
      setIsCancelling(false);
    }
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
          <Select defaultValue={filters.paymentMethod || "all"} name="paymentMethod">
            <SelectTrigger id="paymentMethod" className="w-full">
              <SelectValue placeholder="Semua metode" />
            </SelectTrigger>
            <SelectContent className="z-50">
              <SelectItem value="all">Semua metode</SelectItem>
              {PAYMENT_METHOD_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="form-field">
          <label className="form-label" htmlFor="employeeId">
            Karyawan
          </label>
          <Select defaultValue={filters.employeeId || "all"} name="employeeId">
            <SelectTrigger id="employeeId" className="w-full">
              <SelectValue placeholder="Semua karyawan" />
            </SelectTrigger>
            <SelectContent className="z-50">
              <SelectItem value="all">Semua karyawan</SelectItem>
              {employees.map((employee) => (
                <SelectItem key={employee.id} value={employee.id}>
                  {employee.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {role === "owner" ? (
          <div className="form-field">
            <label className="form-label" htmlFor="scope">
              Scope
            </label>
            <Select defaultValue={filters.scope || "selected"} name="scope">
              <SelectTrigger id="scope" className="w-full">
                <SelectValue placeholder="Bisnis terpilih" />
              </SelectTrigger>
              <SelectContent className="z-50">
                <SelectItem value="selected">Bisnis terpilih</SelectItem>
                <SelectItem value="combined">Gabungan dua bisnis</SelectItem>
              </SelectContent>
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
                <div className="flex flex-wrap items-center gap-1.5">
                  <p className="text-xs text-muted-foreground">
                    {transaction.business?.name ?? "Bisnis tidak diketahui"}
                  </p>
                  <TransactionStatusBadge status={transaction.status} />
                </div>
              </div>
            ),
          },
          {
            key: "customer_name",
            label: "Pelanggan",
            render: (transaction) => (
              <div className="space-y-1">
                <p className={`font-semibold ${transaction.status === "cancelled" || transaction.status === "voided" ? "text-muted-foreground line-through" : "text-foreground"}`}>
                  {transaction.customer_name}
                </p>
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
              <div className={`space-y-2 ${transaction.status === "cancelled" || transaction.status === "voided" ? "opacity-50" : ""}`}>
                {transaction.transaction_services.map((service) => (
                  <div key={service.id} className="text-xs leading-5 text-muted-foreground">
                    <p className="font-semibold text-foreground">{service.service_name_snapshot}</p>
                    <p>{getServiceEmployeeNames(service)}</p>
                  </div>
                ))}
                {transaction.transaction_products.length > 0 ? (
                  <div className="text-xs leading-5 text-muted-foreground">
                    <p className="font-semibold text-foreground">
                      {transaction.transaction_products.length} produk
                    </p>
                  </div>
                ) : null}
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
            render: (transaction) => (
              <span className={transaction.status === "cancelled" || transaction.status === "voided" ? "text-muted-foreground line-through" : ""}>
                <RupiahFormatter value={transaction.total_amount} />
              </span>
            ),
          },
          ...(role === "owner"
            ? [
                {
                  align: "right" as const,
                  key: "total_commission",
                  label: "Komisi",
                  render: (transaction: TransactionListItem) => (
                    <span className={transaction.status === "cancelled" || transaction.status === "voided" ? "text-muted-foreground line-through" : "text-[var(--gold)]"}>
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
              <div className="flex items-center justify-end gap-1">
                <Tooltip content="Lihat detail">
                  <Link
                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-[var(--surface-hover)] hover:text-foreground"
                    href={`/transactions/${transaction.id}`}
                  >
                    <Eye className="h-4 w-4" />
                  </Link>
                </Tooltip>
                {canCancelTransaction(transaction, role) ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-[var(--surface-hover)] hover:text-foreground">
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuPortal>
                      <DropdownMenuContent align="end" className="z-50">
                        <DropdownMenuItem
                          destructive
                          onClick={() => {
                            setPendingCancel(transaction);
                            setCancelReason("");
                            setCancelError(null);
                          }}
                        >
                          <XCircle className="h-4 w-4" />
                          Batalkan
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenuPortal>
                  </DropdownMenu>
                ) : null}
                {transaction.status === "cancelled" || transaction.status === "voided" ? (
                  <Tooltip content="Sudah dibatalkan">
                    <span className="inline-flex h-9 w-9 items-center justify-center text-muted-foreground">
                      <Ban className="h-4 w-4" />
                    </span>
                  </Tooltip>
                ) : null}
              </div>
            ),
          },
        ]}
        emptyMessage="Belum ada transaksi pada filter yang dipilih."
        rowKey={(transaction) => transaction.id}
        rows={transactions}
      />

      <ConfirmDialog
        cancelLabel="Kembali"
        confirmLabel="Batalkan Transaksi"
        description={
          pendingCancel
            ? `Anda akan membatalkan transaksi untuk "${pendingCancel.customer_name}" senilai Rp ${Number(pendingCancel.total_amount).toLocaleString("id-ID")}. Tindakan ini akan mengembalikan stok produk dan menandai transaksi sebagai dibatalkan. Komisi dari transaksi ini tidak akan dihitung.`
            : ""
        }
        isSubmitting={isCancelling}
        open={Boolean(pendingCancel)}
        title="⚠️ Batalkan Transaksi?"
        variant="danger"
        onClose={() => {
          if (!isCancelling) {
            setPendingCancel(null);
            setCancelReason("");
            setCancelError(null);
          }
        }}
        onConfirm={() => void handleCancelTransaction()}
      >
        <div className="mt-4 space-y-3">
          <div className="form-field">
            <label className="form-label text-xs" htmlFor="cancelReason">
              Alasan pembatalan (opsional)
            </label>
            <Textarea
              id="cancelReason"
              placeholder="Contoh: Pelanggan batal, salah input data..."
              value={cancelReason}
              onChange={(event) => setCancelReason(event.target.value)}
              disabled={isCancelling}
            />
          </div>
          {cancelError ? (
            <div className="rounded-xl border border-[color:var(--danger)]/20 bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)]">
              {cancelError}
            </div>
          ) : null}
        </div>
      </ConfirmDialog>
    </div>
  );
}
