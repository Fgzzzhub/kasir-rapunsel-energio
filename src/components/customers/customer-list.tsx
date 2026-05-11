import Link from "next/link";

import { ReportExportButtons } from "@/components/reports/report-export-buttons";
import { BusinessBadge, CustomerTypeBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { RupiahFormatter } from "@/components/ui/rupiah-formatter";
import { Select } from "@/components/ui/select";
import type { CustomerListItem, CustomerSort } from "@/lib/data/customers";
import type { AppBusiness, AppRole } from "@/lib/types/app";
import { formatDateShort } from "@/lib/utils/date";

const sortOptions: Array<{ label: string; value: CustomerSort }> = [
  { label: "Customer terbaru", value: "newest" },
  { label: "Kunjungan terakhir", value: "last_visit" },
  { label: "Paling sering datang", value: "most_visits" },
  { label: "Belanja tertinggi", value: "highest_spending" },
  { label: "Nama A-Z", value: "name_az" },
];

export function CustomerList({
  businesses,
  customers,
  filters,
  role,
  selectedBusiness,
}: {
  businesses: AppBusiness[];
  customers: CustomerListItem[];
  filters: {
    businessId?: string;
    endDate?: string;
    phone?: string;
    search?: string;
    sort?: string;
    startDate?: string;
  };
  role: AppRole;
  selectedBusiness: AppBusiness;
}) {
  const exportParams = new URLSearchParams({
    businessId: selectedBusiness.id,
    businessName: selectedBusiness.name,
    businessIdFilter: role === "owner" ? filters.businessId ?? selectedBusiness.id : selectedBusiness.id,
  });

  if (filters.startDate) exportParams.set("startDate", filters.startDate);
  if (filters.endDate) exportParams.set("endDate", filters.endDate);
  if (filters.search) exportParams.set("search", filters.search);
  if (filters.phone) exportParams.set("phone", filters.phone);
  if (filters.sort) exportParams.set("sort", filters.sort);

  return (
    <div className="space-y-6">
      <form className="theme-card grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-6">
        <div className="form-field xl:col-span-2">
          <label className="form-label" htmlFor="search">
            Nama customer
          </label>
          <Input defaultValue={filters.search} id="search" name="search" placeholder="Cari nama" />
        </div>
        <div className="form-field">
          <label className="form-label" htmlFor="phone">
            Nomor telepon
          </label>
          <Input defaultValue={filters.phone} id="phone" name="phone" placeholder="Cari nomor" />
        </div>
        {role === "owner" ? (
          <div className="form-field">
            <label className="form-label" htmlFor="businessId">
              Bisnis
            </label>
            <Select defaultValue={filters.businessId ?? selectedBusiness.id} id="businessId" name="businessId">
              <option value="all">Semua bisnis</option>
              {businesses.map((business) => (
                <option key={business.id} value={business.id}>
                  {business.name}
                </option>
              ))}
            </Select>
          </div>
        ) : null}
        <div className="form-field">
          <label className="form-label" htmlFor="sort">
            Urutkan
          </label>
          <Select defaultValue={filters.sort ?? "newest"} id="sort" name="sort">
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="form-field">
          <label className="form-label" htmlFor="startDate">
            Dari tanggal
          </label>
          <Input defaultValue={filters.startDate} id="startDate" name="startDate" type="date" />
        </div>
        <div className="form-field">
          <label className="form-label" htmlFor="endDate">
            Sampai tanggal
          </label>
          <Input defaultValue={filters.endDate} id="endDate" name="endDate" type="date" />
        </div>
        <div className="flex items-end gap-3 md:col-span-2 xl:col-span-6">
          <Button type="submit">Terapkan filter</Button>
          <Link
            className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-[color:var(--border)] bg-[var(--surface-hover)] px-4 py-2 text-sm font-semibold hover:bg-[var(--surface-elevated)]"
            href="/customers"
          >
            Reset
          </Link>
        </div>
      </form>

      <div className="flex flex-wrap justify-end gap-3">
        <ReportExportButtons
          actions={[
            {
              href: `/api/exports/customers?${exportParams.toString()}`,
              label: "Export Excel",
            },
          ]}
        />
      </div>

      {customers.length ? (
        <>
          <div className="hidden lg:block">
            <DataTable
              columns={[
                {
                  key: "name",
                  label: "Customer",
                  render: (customer) => (
                    <div className="space-y-1">
                      <p className="font-semibold">{customer.name}</p>
                      <p className="text-xs text-muted-foreground">{customer.phone || "Tanpa nomor"}</p>
                    </div>
                  ),
                },
                {
                  key: "business",
                  label: "Bisnis",
                  render: (customer) => (
                    <div className="flex flex-wrap gap-2">
                      {customer.business_names.length ? (
                        customer.business_names.map((name, index) => (
                          <BusinessBadge key={`${name}-${index}`} name={name} slug={customer.business_slugs[index]} />
                        ))
                      ) : (
                        "-"
                      )}
                    </div>
                  ),
                },
                {
                  key: "total_visits",
                  label: "Kunjungan",
                  render: (customer) => (
                    <div className="space-y-1">
                      <p className="font-semibold">{customer.total_visits}</p>
                      <CustomerTypeBadge visits={customer.total_visits} />
                    </div>
                  ),
                },
                {
                  align: "right",
                  key: "total_spending",
                  label: "Total belanja",
                  render: (customer) => <RupiahFormatter value={customer.total_spending} />,
                },
                {
                  key: "last_visit",
                  label: "Terakhir",
                  render: (customer) => (customer.last_visit ? formatDateShort(customer.last_visit) : "-"),
                },
                {
                  key: "favorite_service",
                  label: "Layanan favorit",
                  render: (customer) => customer.favorite_service ?? "-",
                },
                {
                  key: "created_at",
                  label: "Dibuat",
                  render: (customer) => formatDateShort(customer.created_at),
                },
                {
                  key: "action",
                  label: "Aksi",
                  render: (customer) => (
                    <Link className="font-semibold text-[var(--accent)]" href={`/customers/${customer.id}`}>
                      Lihat detail
                    </Link>
                  ),
                },
              ]}
              emptyMessage="Belum ada data customer. Customer akan otomatis tersimpan saat transaksi dibuat."
              rowKey={(customer) => customer.id}
              rows={customers}
            />
          </div>

          <div className="grid gap-4 lg:hidden">
            {customers.map((customer) => (
              <Card key={customer.id} className="p-4">
                <CardHeader className="mb-3 px-0">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-xl">{customer.name}</CardTitle>
                      <CardDescription>{customer.phone || "Tanpa nomor telepon"}</CardDescription>
                    </div>
                    <CustomerTypeBadge visits={customer.total_visits} />
                  </div>
                </CardHeader>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">Kunjungan</p>
                    <p className="font-semibold">{customer.total_visits}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Total belanja</p>
                    <p className="font-semibold">
                      <RupiahFormatter value={customer.total_spending} />
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Terakhir</p>
                    <p className="font-semibold">{customer.last_visit ? formatDateShort(customer.last_visit) : "-"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Dibuat</p>
                    <p className="font-semibold">{formatDateShort(customer.created_at)}</p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-2">
                    {customer.business_names.map((name, index) => (
                      <BusinessBadge key={`${name}-${index}`} name={name} slug={customer.business_slugs[index]} />
                    ))}
                  </div>
                  <Link href={`/customers/${customer.id}`}>
                    <Button variant="secondary">Lihat detail</Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        </>
      ) : (
        <EmptyState
          action={
            <Link href="/transactions/new">
              <Button>Buat transaksi baru</Button>
            </Link>
          }
          description="Customer akan otomatis tersimpan saat transaksi dibuat."
          title="Belum ada data customer"
        />
      )}
    </div>
  );
}
