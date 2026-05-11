import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";

import { CustomerEditForm } from "@/components/customers/customer-edit-form";
import { BusinessBadge, CustomerTypeBadge, PaymentMethodBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { RupiahFormatter } from "@/components/ui/rupiah-formatter";
import { requireAuthenticatedProfile } from "@/lib/auth/session";
import { getCustomerById } from "@/lib/data/customers";
import { formatDateShort, formatDateTime } from "@/lib/utils/date";

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireAuthenticatedProfile();
  const { id } = await params;
  const customer = await getCustomerById({
    businessId: session.selectedBusiness.id,
    customerId: id,
    role: session.profile.role,
  });

  const primaryBusiness = customer.transactions[0]?.business;

  return (
    <>
      <section className="page-title">
        <Link className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-[var(--accent)]" href="/customers">
          <ArrowLeft className="h-4 w-4" />
          Kembali ke Data Customer
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          {primaryBusiness ? <BusinessBadge name={primaryBusiness.name} slug={primaryBusiness.slug} /> : null}
          <CustomerTypeBadge visits={customer.total_visits} />
        </div>
        <h1>{customer.name}</h1>
        <p>Profil customer, ringkasan kunjungan, dan histori transaksi yang tersimpan sebagai snapshot.</p>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <div className="space-y-6">
          <Card>
            <div className="flex items-start gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl bg-[var(--accent)] text-xl font-semibold text-white">
                {getInitials(customer.name) || "C"}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-2xl font-semibold">{customer.name}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{customer.phone || "Tanpa nomor telepon"}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {customer.business_names.map((name, index) => (
                    <BusinessBadge key={`${name}-${index}`} name={name} slug={customer.business_slugs[index]} />
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
              <div className="theme-card-muted p-4">
                <p className="text-muted-foreground">Total kunjungan</p>
                <p className="mt-1 font-semibold">{customer.total_visits}</p>
              </div>
              <div className="theme-card-muted p-4">
                <p className="text-muted-foreground">Total belanja</p>
                <p className="mt-1 font-semibold">
                  <RupiahFormatter value={customer.total_spending} />
                </p>
              </div>
              <div className="theme-card-muted p-4">
                <p className="text-muted-foreground">Pertama datang</p>
                <p className="mt-1 font-semibold">{customer.first_visit ? formatDateShort(customer.first_visit) : "-"}</p>
              </div>
              <div className="theme-card-muted p-4">
                <p className="text-muted-foreground">Terakhir datang</p>
                <p className="mt-1 font-semibold">{customer.last_visit ? formatDateShort(customer.last_visit) : "-"}</p>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader className="px-0">
              <CardTitle>Edit customer</CardTitle>
              <CardDescription>Perubahan profil tidak mengubah snapshot transaksi lama.</CardDescription>
            </CardHeader>
            <CustomerEditForm customer={customer} />
          </Card>
        </div>

        <div className="space-y-6">
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <Card className="p-4">
              <p className="text-sm font-semibold text-muted-foreground">Rata-rata per kunjungan</p>
              <p className="mt-2 text-xl font-semibold">
                <RupiahFormatter value={customer.average_spending} />
              </p>
            </Card>
            <Card className="p-4">
              <p className="text-sm font-semibold text-muted-foreground">Layanan favorit</p>
              <p className="mt-2 text-xl font-semibold">{customer.favorite_service ?? "-"}</p>
            </Card>
            <Card className="p-4">
              <p className="text-sm font-semibold text-muted-foreground">Produk favorit</p>
              <p className="mt-2 text-xl font-semibold">{customer.favorite_product ?? "-"}</p>
            </Card>
          </section>

          <Card>
            <CardHeader className="px-0">
              <CardTitle>Riwayat transaksi</CardTitle>
              <CardDescription>Layanan, produk, pembayaran, dan tautan struk customer.</CardDescription>
            </CardHeader>
            <DataTable
              columns={[
                {
                  key: "created_at",
                  label: "Tanggal",
                  render: (transaction) => (
                    <div className="space-y-1">
                      <p className="font-semibold">{formatDateTime(transaction.created_at)}</p>
                      {transaction.business ? (
                        <BusinessBadge name={transaction.business.name} slug={transaction.business.slug} />
                      ) : null}
                    </div>
                  ),
                },
                {
                  key: "services",
                  label: "Layanan",
                  render: (transaction) => transaction.service_summary,
                },
                {
                  key: "products",
                  label: "Produk",
                  render: (transaction) => transaction.product_summary,
                },
                {
                  key: "payment_method",
                  label: "Pembayaran",
                  render: (transaction) => <PaymentMethodBadge method={transaction.payment_method} />,
                },
                {
                  align: "right",
                  key: "total_amount",
                  label: "Total",
                  render: (transaction) => <RupiahFormatter value={transaction.total_amount} />,
                },
                {
                  key: "actions",
                  label: "Aksi",
                  render: (transaction) => (
                    <div className="flex flex-wrap gap-2">
                      <Link className="font-semibold text-[var(--accent)]" href={`/transactions/${transaction.id}`}>
                        Lihat detail
                      </Link>
                      <Link className="inline-flex items-center gap-1 font-semibold text-[var(--accent)]" href={`/transactions/${transaction.id}/receipt`}>
                        <Printer className="h-3.5 w-3.5" />
                        Cetak struk
                      </Link>
                    </div>
                  ),
                },
              ]}
              emptyMessage="Belum ada transaksi untuk customer ini."
              rowKey={(transaction) => transaction.id}
              rows={customer.transactions}
            />
          </Card>

          <div className="flex justify-end">
            <Link href="/transactions/new">
              <Button>Buat transaksi baru</Button>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
