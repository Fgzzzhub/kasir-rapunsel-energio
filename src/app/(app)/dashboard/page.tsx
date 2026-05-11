import Link from "next/link";
import { BriefcaseBusiness, Coins, HandCoins, ReceiptText, Repeat, UserRound, WalletCards } from "lucide-react";

import { StatCard } from "@/components/dashboard/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { RupiahFormatter } from "@/components/ui/rupiah-formatter";
import { getDashboardMetrics } from "@/lib/data/dashboard";
import { requireAuthenticatedProfile } from "@/lib/auth/session";
import { formatDateTime } from "@/lib/utils/date";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireAuthenticatedProfile();
  const params = await searchParams;
  const scope =
    session.profile.role === "owner" && params.scope === "combined" ? "combined" : "selected";

  const metrics = await getDashboardMetrics({
    businessId: session.selectedBusiness.id,
    role: session.profile.role,
    scope,
  });

  return (
    <>
      <section className="page-title">
        <span className="theme-pill w-fit">
          {scope === "combined" ? "Dashboard gabungan" : session.selectedBusiness.name}
        </span>
        <h1>Ringkasan operasional harian</h1>
        <p>
          {session.profile.role === "owner"
            ? "Pantau performa dua bisnis, komisi bulanan, pengeluaran, dan estimasi laba bersih dari satu dashboard."
            : "Pantau transaksi harian bisnis aktif dan akses cepat untuk membuat transaksi baru."}
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/transactions/new">
            <Button className="gap-2">
              <WalletCards className="h-4 w-4" />
              Buat transaksi baru
            </Button>
          </Link>
          {session.profile.role === "owner" ? (
            <>
              <Link href="/dashboard?scope=selected">
                <Button variant={scope === "selected" ? "primary" : "secondary"}>
                  Bisnis terpilih
                </Button>
              </Link>
              <Link href="/dashboard?scope=combined">
                <Button variant={scope === "combined" ? "primary" : "secondary"}>
                  Gabungan dua bisnis
                </Button>
              </Link>
            </>
          ) : null}
        </div>
      </section>

      <section
        className={`grid gap-4 sm:grid-cols-2 ${
          session.profile.role === "owner" ? "lg:grid-cols-3" : ""
        }`}
      >
        <StatCard
          caption="Akumulasi pemasukan transaksi pada hari ini."
          icon={<Coins className="h-5 w-5" />}
          title="Revenue hari ini"
          value={<RupiahFormatter value={metrics.todayRevenue} />}
        />
        <StatCard
          caption="Jumlah transaksi yang masuk hari ini."
          icon={<ReceiptText className="h-5 w-5" />}
          title="Transaksi hari ini"
          value={metrics.todayTransactionsCount}
        />
        <StatCard
          caption="Customer unik yang bertransaksi hari ini."
          icon={<UserRound className="h-5 w-5" />}
          title="Customer hari ini"
          value={metrics.todayCustomersCount}
        />
        <StatCard
          caption={
            session.profile.role === "owner"
              ? "Total pendapatan bulan berjalan pada scope aktif."
              : "Transaksi terbaru tersedia di bagian bawah halaman."
          }
          icon={<BriefcaseBusiness className="h-5 w-5" />}
          title={session.profile.role === "owner" ? "Revenue bulan ini" : "Bisnis aktif"}
          value={
            session.profile.role === "owner" ? (
              <RupiahFormatter value={metrics.monthRevenue} />
            ) : (
              session.selectedBusiness.name
            )
          }
        />
        {session.profile.role === "owner" ? (
          <>
            <StatCard
              caption="Komisi transaksi dari detail layanan bulan ini."
              icon={<HandCoins className="h-5 w-5" />}
              title="Komisi bulan ini"
              value={<RupiahFormatter value={metrics.monthCommission} />}
            />
            <StatCard
              caption="Pengeluaran bulan berjalan berdasarkan data pengeluaran operasional."
              icon={<ReceiptText className="h-5 w-5" />}
              title="Pengeluaran bulan ini"
              value={<RupiahFormatter value={metrics.monthExpenses} />}
            />
            <StatCard
              caption="Estimasi laba bersih bulan berjalan setelah komisi dan pengeluaran."
              icon={<Coins className="h-5 w-5" />}
              title="Estimasi laba"
              value={<RupiahFormatter value={metrics.estimatedMonthNetProfit} />}
            />
            <StatCard
              caption="Customer unik dengan transaksi pada bulan berjalan."
              icon={<UserRound className="h-5 w-5" />}
              title="Customer bulan ini"
              value={metrics.monthCustomersCount}
            />
            <StatCard
              caption="Customer dengan lebih dari satu transaksi bulan ini."
              icon={<Repeat className="h-5 w-5" />}
              title="Customer kembali"
              value={metrics.repeatCustomersThisMonth}
            />
          </>
        ) : null}
      </section>

      {session.profile.role === "owner" ? (
        <section className="grid gap-4 md:grid-cols-2">
          {metrics.perBusiness.map((business) => (
            <Card key={business.businessId}>
              <CardHeader className="px-0">
                <CardTitle>{business.name}</CardTitle>
                <CardDescription>
                  Ringkasan harian dan bulanan untuk bisnis ini pada bulan berjalan.
                </CardDescription>
              </CardHeader>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="theme-card-muted p-4">
                  <p className="text-sm font-semibold text-muted-foreground">Revenue hari ini</p>
                  <p className="mt-1 font-semibold text-foreground">
                    <RupiahFormatter value={business.todayRevenue} />
                  </p>
                </div>
                <div className="theme-card-muted p-4">
                  <p className="text-sm font-semibold text-muted-foreground">Transaksi hari ini</p>
                  <p className="mt-1 font-semibold text-foreground">{business.todayTransactionsCount}</p>
                </div>
                <div className="theme-card-muted p-4">
                  <p className="text-sm font-semibold text-muted-foreground">Revenue bulan ini</p>
                  <p className="mt-1 font-semibold text-foreground">
                    <RupiahFormatter value={business.monthRevenue} />
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </section>
      ) : null}

      {session.profile.role === "owner" ? (
        <section className="grid gap-6 xl:grid-cols-2">
          <Card>
            <CardHeader className="px-0">
              <CardTitle>Layanan terlaris bulan ini</CardTitle>
              <CardDescription>Berdasarkan jumlah layanan dalam transaksi bulan berjalan.</CardDescription>
            </CardHeader>
            <div className="space-y-3">
              {metrics.topServices.length ? (
                metrics.topServices.map((service) => (
                  <div key={service.serviceName} className="theme-card-muted flex items-center justify-between gap-3 p-4">
                    <div>
                      <p className="font-semibold text-foreground">{service.serviceName}</p>
                      <p className="text-sm text-muted-foreground">{service.totalServices} layanan</p>
                    </div>
                    <p className="text-sm font-semibold text-foreground">
                      <RupiahFormatter value={service.totalRevenue} />
                    </p>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-[color:var(--border)] bg-[var(--surface-muted)] px-4 py-5 text-sm text-muted-foreground">
                  Belum ada layanan yang tercatat bulan ini.
                </div>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader className="px-0">
              <CardTitle>Produk terjual bulan ini</CardTitle>
              <CardDescription>Khusus produk Rapunsel Salon yang masuk transaksi.</CardDescription>
            </CardHeader>
            <div className="space-y-3">
              {metrics.topProducts.length ? (
                metrics.topProducts.map((product) => (
                  <div key={product.productName} className="theme-card-muted flex items-center justify-between gap-3 p-4">
                    <div>
                      <p className="font-semibold text-foreground">{product.productName}</p>
                      <p className="text-sm text-muted-foreground">{product.totalProducts} produk</p>
                    </div>
                    <p className="text-sm font-semibold text-foreground">
                      <RupiahFormatter value={product.totalRevenue} />
                    </p>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-[color:var(--border)] bg-[var(--surface-muted)] px-4 py-5 text-sm text-muted-foreground">
                  Belum ada produk yang terjual bulan ini.
                </div>
              )}
            </div>
          </Card>
        </section>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader className="px-0">
            <CardTitle>Transaksi terbaru</CardTitle>
            <CardDescription>
              Ringkasan cepat untuk monitoring front desk dan owner.
            </CardDescription>
          </CardHeader>
          <DataTable
            columns={[
              {
                key: "created_at",
                label: "Waktu",
                render: (transaction) => formatDateTime(transaction.created_at),
              },
              {
                key: "customer_name",
                label: "Pelanggan",
                render: (transaction) => transaction.customer_name,
              },
              {
                key: "services",
                label: "Layanan",
                render: (transaction) => transaction.transaction_services.length,
              },
              {
                align: "right",
                key: "total_amount",
                label: "Total",
                render: (transaction) => <RupiahFormatter value={transaction.total_amount} />,
              },
            ]}
            emptyMessage="Belum ada transaksi hari ini."
            rowKey={(transaction) => transaction.id}
            rows={metrics.recentTransactions}
          />
        </Card>

        {session.profile.role === "owner" ? (
          <Card>
            <CardHeader className="px-0">
              <CardTitle>Karyawan performa terbaik</CardTitle>
              <CardDescription>
                Diurutkan berdasarkan total komisi bulan berjalan untuk scope yang sedang aktif.
              </CardDescription>
            </CardHeader>
            <div className="space-y-3">
              {metrics.bestEmployees.length ? (
                metrics.bestEmployees.map((employee) => (
                  <div
                    key={`${employee.employeeName}-${employee.totalCommission}`}
                    className="theme-card-muted flex items-center justify-between gap-3 p-4"
                  >
                    <div>
                      <p className="font-semibold text-foreground">{employee.employeeName}</p>
                      <p className="text-sm text-muted-foreground">
                        {employee.handledServices} layanan
                        {employee.handledRevenue ? (
                          <>
                            {" "}
                            dengan omzet <RupiahFormatter value={employee.handledRevenue} />
                          </>
                        ) : null}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-[var(--gold)]">
                      <RupiahFormatter value={employee.totalCommission} />
                    </p>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-[color:var(--border)] bg-[var(--surface-muted)] px-4 py-5 text-sm text-muted-foreground">
                  Belum ada komisi yang tercatat pada periode ini.
                </div>
              )}
            </div>
          </Card>
        ) : (
          <Card>
            <CardHeader className="px-0">
              <CardTitle>Akses cepat</CardTitle>
              <CardDescription>
                Admin fokus pada transaksi dan pemantauan harian bisnis aktif.
              </CardDescription>
            </CardHeader>
            <div className="theme-card-muted flex h-full items-center justify-between gap-4 p-4">
              <div>
                <p className="text-sm font-semibold text-foreground-secondary">Transaksi baru</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Buka form transaksi untuk front desk atau admin.
                </p>
              </div>
              <Link href="/transactions/new">
                <Button className="gap-2">
                  <WalletCards className="h-4 w-4" />
                  Buat transaksi
                </Button>
              </Link>
            </div>
          </Card>
        )}
      </section>
    </>
  );
}
