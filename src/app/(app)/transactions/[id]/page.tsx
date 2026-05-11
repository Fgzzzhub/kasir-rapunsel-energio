import Link from "next/link";
import { Printer } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { RupiahFormatter } from "@/components/ui/rupiah-formatter";
import { requireAuthenticatedProfile } from "@/lib/auth/session";
import { getTransactionById } from "@/lib/data/transactions";
import { formatDateTime } from "@/lib/utils/date";
import { toNumber } from "@/lib/utils/currency";
import {
  formatCommissionRate,
  getEffectiveCommissionRate,
  getServiceEmployeeNames,
  getServiceEmployeeSplits,
  getServiceTotalCommission,
} from "@/lib/utils/transaction-services";

export default async function TransactionDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireAuthenticatedProfile();
  const { id } = await params;
  const query = await searchParams;
  const transaction = await getTransactionById({
    businessId: session.selectedBusiness.id,
    id,
    role: session.profile.role,
  });

  const totalCommission = transaction.transaction_services.reduce(
    (sum, item) => sum + getServiceTotalCommission(item),
    0,
  ) + (transaction.transaction_products ?? []).reduce(
    (sum, item) => sum + toNumber(item.commission_amount),
    0,
  );
  const totalServices = transaction.transaction_services.reduce(
    (sum, item) => sum + toNumber(item.price_snapshot),
    0,
  );
  const totalProducts = (transaction.transaction_products ?? []).reduce(
    (sum, item) => sum + toNumber(item.subtotal),
    0,
  );

  const isJustCreated = query.created === "1";

  return (
    <>
      <section className="page-title">
        <span className="theme-pill w-fit">{transaction.business?.name ?? "Detail transaksi"}</span>
        <h1>Ringkasan transaksi</h1>
        <p>
          Snapshot layanan
          {session.profile.role === "owner" ? " dan komisi" : ""} di bawah ini tersimpan
          permanen, sehingga histori tidak berubah walaupun data master diperbarui nanti.
        </p>
      </section>

      {isJustCreated ? (
        <div className="rounded-3xl border border-emerald-500/20 bg-[var(--success-soft)] p-5 space-y-4">
          <div className="flex items-start gap-4">
            <div className="flex-1">
              <p className="text-base font-semibold text-emerald-400">✓ Transaksi berhasil disimpan!</p>
              <p className="text-sm text-emerald-400 mt-1">
                Pelanggan: <strong>{transaction.customer_name}</strong>
                {transaction.customer_phone ? ` · ${transaction.customer_phone}` : ""} ·{" "}
                <strong>{transaction.payment_method.toUpperCase()}</strong> ·{" "}
                Total:{" "}
                <strong>
                  <RupiahFormatter value={transaction.total_amount} />
                </strong>
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href={`/transactions/${id}/receipt`}>
              <Button>
                <Printer className="mr-2 h-4 w-4" />
                Cetak struk
              </Button>
            </Link>
            <Link href="/transactions/new">
              <Button variant="secondary">Transaksi baru</Button>
            </Link>
            <Link href="/transactions">
              <Button variant="ghost">Lihat riwayat</Button>
            </Link>
          </div>
        </div>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardHeader className="px-0">
            <CardTitle>Informasi utama</CardTitle>
            <CardDescription>Ringkasan pelanggan dan pembayaran.</CardDescription>
          </CardHeader>
          <div className="space-y-4 text-sm">
            <div>
              <p className="font-semibold text-muted-foreground">Pelanggan</p>
              <p className="mt-1 text-base font-semibold">{transaction.customer_name}</p>
              <p className="text-muted-foreground">
                {transaction.customer_phone || "Tanpa nomor telepon"}
              </p>
            </div>
            <div>
              <p className="font-semibold text-muted-foreground">Dibuat pada</p>
              <p className="mt-1">{formatDateTime(transaction.created_at)}</p>
            </div>
            <div>
              <p className="font-semibold text-muted-foreground">Metode pembayaran</p>
              <p className="mt-1 uppercase">{transaction.payment_method}</p>
            </div>
            {totalServices > 0 && (
              <div>
                <p className="font-semibold text-muted-foreground">Total layanan</p>
                <p className="mt-1 font-semibold">
                  <RupiahFormatter value={totalServices} />
                </p>
              </div>
            )}
            {totalProducts > 0 && (
              <div>
                <p className="font-semibold text-muted-foreground">Total produk</p>
                <p className="mt-1 font-semibold">
                  <RupiahFormatter value={totalProducts} />
                </p>
              </div>
            )}
            <div>
              <p className="font-semibold text-muted-foreground">Total transaksi</p>
              <p className="mt-1 text-lg font-semibold">
                <RupiahFormatter value={transaction.total_amount} />
              </p>
            </div>
            {session.profile.role === "owner" ? (
              <div>
                <p className="font-semibold text-muted-foreground">Total komisi</p>
                <p className="mt-1 text-lg font-semibold">
                  <RupiahFormatter value={totalCommission} />
                </p>
              </div>
            ) : null}
            <div className="flex flex-wrap gap-3 pt-2">
              <Link href={`/transactions/${id}/receipt`}>
                <Button variant="secondary" className="gap-2">
                  <Printer className="h-4 w-4" />
                  Cetak struk
                </Button>
              </Link>
              <Link className="text-sm font-semibold text-[var(--accent)] flex items-center" href="/transactions">
                Kembali ke riwayat
              </Link>
            </div>
          </div>
        </Card>

        <div className="space-y-6">
          {transaction.transaction_services.length > 0 && (
            <Card>
              <CardHeader className="px-0">
                <CardTitle>Detail layanan</CardTitle>
                <CardDescription>
                  {session.profile.role === "owner"
                    ? "Perhitungan komisi berdasarkan snapshot harga dan rate pada saat transaksi."
                    : "Detail layanan tersimpan sebagai snapshot histori transaksi."}
                </CardDescription>
              </CardHeader>
              <DataTable
                columns={[
                  {
                    key: "service_name_snapshot",
                    label: "Layanan",
                  },
                  {
                    key: "employees",
                    label: "Dikerjakan oleh",
                    render: (item) => getServiceEmployeeNames(item),
                  },
                  {
                    align: "right",
                    key: "price_snapshot",
                    label: "Harga",
                    render: (item) => <RupiahFormatter value={item.price_snapshot} />,
                  },
                  ...(session.profile.role === "owner"
                    ? [
                        {
                          key: "commission_rate_snapshot",
                          label: "Rate komisi",
                          render: (item: (typeof transaction.transaction_services)[number]) =>
                            getServiceEmployeeSplits(item)
                              .map(
                                (employee) =>
                                  `${employee.employee_name_snapshot} ${formatCommissionRate(
                                    getEffectiveCommissionRate(employee),
                                  )}%`,
                              )
                              .join(", "),
                        },
                        {
                          align: "right" as const,
                          key: "commission_amount",
                          label: "Nilai komisi",
                          render: (item: (typeof transaction.transaction_services)[number]) => (
                            <div className="space-y-1">
                              {getServiceEmployeeSplits(item).map((employee) => (
                                <div key={employee.id} className="flex justify-end gap-2 text-xs">
                                  <span className="text-muted-foreground">{employee.employee_name_snapshot}</span>
                                  <RupiahFormatter value={employee.commission_amount} />
                                </div>
                              ))}
                              <div className="font-semibold">
                                <RupiahFormatter value={getServiceTotalCommission(item)} />
                              </div>
                            </div>
                          ),
                        },
                      ]
                    : []),
                ]}
                emptyMessage="Tidak ada layanan dalam transaksi ini."
                rowKey={(item) => item.id}
                rows={transaction.transaction_services}
              />
            </Card>
          )}

          {(transaction.transaction_products ?? []).length > 0 && (
            <Card>
              <CardHeader className="px-0">
                <CardTitle>Detail produk</CardTitle>
                <CardDescription>Produk yang terjual dalam transaksi ini.</CardDescription>
              </CardHeader>
              <DataTable
                columns={[
                  {
                    key: "product_name_snapshot",
                    label: "Produk",
                  },
                  {
                    align: "right",
                    key: "qty",
                    label: "Qty",
                    render: (item) => String(item.qty),
                  },
                  {
                    align: "right",
                    key: "price_snapshot",
                    label: "Harga satuan",
                    render: (item) => <RupiahFormatter value={item.price_snapshot} />,
                  },
                  {
                    align: "right",
                    key: "subtotal",
                    label: "Subtotal",
                    render: (item) => <RupiahFormatter value={item.subtotal} />,
                  },
                  ...(session.profile.role === "owner"
                    ? [
                        {
                          key: "employee_name_snapshot",
                          label: "Penjual",
                          render: (item: (typeof transaction.transaction_products)[number]) =>
                            item.employee_name_snapshot ?? "-",
                        },
                        {
                          key: "commission_rate_snapshot",
                          label: "Rate komisi",
                          render: (item: (typeof transaction.transaction_products)[number]) =>
                            `${formatCommissionRate(toNumber(item.commission_rate_snapshot))}%`,
                        },
                        {
                          align: "right" as const,
                          key: "commission_amount",
                          label: "Nilai komisi",
                          render: (item: (typeof transaction.transaction_products)[number]) => (
                            <RupiahFormatter value={item.commission_amount} />
                          ),
                        },
                      ]
                    : []),
                ]}
                emptyMessage="Tidak ada produk dalam transaksi ini."
                rowKey={(item) => item.id}
                rows={transaction.transaction_products ?? []}
              />
            </Card>
          )}

          {transaction.transaction_services.length === 0 && (transaction.transaction_products ?? []).length === 0 && (
            <Card>
              <CardHeader className="px-0">
                <CardTitle>Detail layanan & produk</CardTitle>
              </CardHeader>
              <p className="text-sm text-muted-foreground py-4">
                Tidak ada detail layanan atau produk yang tersimpan.
              </p>
            </Card>
          )}
        </div>
      </section>
    </>
  );
}
