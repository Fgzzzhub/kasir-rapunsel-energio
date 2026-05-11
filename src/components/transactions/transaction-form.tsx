"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2, Search, Check, Tag } from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import { Controller, useFieldArray, useForm, useWatch, type Resolver } from "react-hook-form";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { CurrencyInput } from "@/components/ui/currency-input";
import { PAYMENT_METHOD_OPTIONS, isRapunselBusiness } from "@/lib/constants/app";
import { transactionSchema, type TransactionSchema } from "@/lib/schemas/transaction";
import type { EmployeeRow, ServiceRow, ProductRow, TransactionSummary } from "@/lib/types/app";
import { formatRupiah } from "@/lib/utils/currency";
import { formatCommissionRate } from "@/lib/utils/transaction-services";

import { EmployeeMultiSelector } from "./employee-multi-selector";
import { ServiceSelector } from "./service-selector";
import { ProductSelector } from "./product-selector";
import { TransactionSummary as SummaryCard } from "./transaction-summary";

type TransactionFormProps = {
  businessId: string;
  businessSlug: string;
  canViewCommission: boolean;
  employees: EmployeeRow[];
  services: ServiceRow[];
  products: ProductRow[];
  taxPercentage?: number;
  serviceChargePercentage?: number;
};

export function TransactionForm({
  businessId,
  businessSlug,
  canViewCommission,
  employees,
  services,
  products,
  taxPercentage = 0,
  serviceChargePercentage = 0,
}: TransactionFormProps) {
  const router = useRouter();
  const supportsProducts = isRapunselBusiness(businessSlug);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLookingUpCustomer, setIsLookingUpCustomer] = useState(false);
  const [customerLookupStatus, setCustomerLookupStatus] = useState<"idle" | "found" | "not_found">("idle");

  const form = useForm<TransactionSchema>({
    defaultValues: {
      businessId,
      customerName: "",
      customerPhone: "",
      services: [],
      products: [],
      notes: "",
      paymentMethod: "cash",
      taxAmount: 0,
      serviceChargeAmount: 0,
    },
    // zodResolver type doesn't perfectly match React Hook Form's generic inference
    // when the schema has optional arrays. Casting through Resolver is safe here.
    resolver: zodResolver(transactionSchema) as Resolver<TransactionSchema>,
  });

  const { control, formState, handleSubmit, register, setValue } = form;
  const { fields: serviceFields, append: appendService, remove: removeService } = useFieldArray({
    control,
    name: "services",
  });
  const { fields: productFields, append: appendProduct, remove: removeProduct } = useFieldArray({
    control,
    name: "products",
  });

  const watchedServices = useWatch({ control, name: "services" });
  const watchedProducts = useWatch({ control, name: "products" });
  const watchedPhone = useWatch({ control, name: "customerPhone" });
  const watchedPaymentMethod = useWatch({ control, name: "paymentMethod" });

  const serviceMap = useMemo(() => new Map(services.map((s) => [s.id, s])), [services]);
  const employeeMap = useMemo(() => new Map(employees.map((e) => [e.id, e])), [employees]);
  const productMap = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  // Debounced customer lookup
  useEffect(() => {
    const phone = watchedPhone?.trim();
    if (!phone || phone.length < 8) {
      setTimeout(() => setCustomerLookupStatus("idle"), 0);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLookingUpCustomer(true);
      try {
        const res = await fetch(`/api/customers?phone=${encodeURIComponent(phone)}`);
        const result = await res.json();
        if (result.data) {
          setValue("customerName", result.data.name);
          setCustomerLookupStatus("found");
        } else {
          setCustomerLookupStatus("not_found");
        }
      } catch {
        setCustomerLookupStatus("idle");
      } finally {
        setIsLookingUpCustomer(false);
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [watchedPhone, setValue]);

  const totals = useMemo(() => {
    let totalServices = 0;
    let totalProducts = 0;
    let totalCommission = 0;

    (watchedServices ?? []).forEach((item) => {
      const service = serviceMap.get(item?.serviceId ?? "");
      const employeeIds = item?.employeeIds ?? [];
      const defaultPrice = Number(service?.price ?? 0);
      const finalPrice = item?.finalPrice ?? defaultPrice;
      const splitBase = employeeIds.length ? finalPrice / employeeIds.length : 0;
      const commissionAmount = employeeIds.reduce((sum, employeeId) => {
        const employee = employeeMap.get(employeeId);
        return sum + (splitBase * Number(employee?.commission_rate ?? 0)) / 100;
      }, 0);

      totalServices += finalPrice;
      totalCommission += commissionAmount;
    });

    (watchedProducts ?? []).forEach((item) => {
      const product = productMap.get(item?.productId ?? "");
      const price = Number(product?.price ?? 0);
      totalProducts += price * (item?.qty || 1);
    });

    const totalItems = (watchedServices?.length ?? 0) + (watchedProducts?.length ?? 0);
    const subtotal = totalServices + totalProducts;
    const serviceChargeAmount = subtotal * (serviceChargePercentage / 100);
    const taxAmount = subtotal * (taxPercentage / 100);
    const totalAmount = subtotal + serviceChargeAmount + taxAmount;

    return { totalAmount, subtotal, taxAmount, serviceChargeAmount, totalServices, totalProducts, totalCommission, totalItems };
  }, [employeeMap, serviceMap, productMap, watchedServices, watchedProducts, taxPercentage, serviceChargePercentage]);

  async function onSubmit(values: TransactionSchema) {
    setIsSubmitting(true);
    setSubmitError(null);

    values.taxAmount = totals.taxAmount;
    values.serviceChargeAmount = totals.serviceChargeAmount;

    const response = await fetch("/api/transactions", {
      body: JSON.stringify(values),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    const payload = (await response.json()) as {
      data?: TransactionSummary;
      error?: string;
    };

    setIsSubmitting(false);

    if (!response.ok || !payload.data) {
      setSubmitError(payload.error ?? "Transaksi gagal disimpan.");
      return;
    }

    router.push(`/transactions/${payload.data.transactionId}?created=1`);
    router.refresh();
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
      <Card>
        <CardHeader className="px-0">
          <CardTitle>Transaksi baru</CardTitle>
          <CardDescription>
            Masukkan pelanggan, layanan, dan produk. Total komisi dihitung dari harga layanan final.
          </CardDescription>
        </CardHeader>
        <form className="space-y-6 pb-28 xl:pb-0" id="transaction-form" onSubmit={handleSubmit(onSubmit)}>
          <input type="hidden" value={businessId} {...register("businessId")} />

          {/* Customer Info Section */}
          <div className="space-y-4 rounded-xl border border-[color:var(--border-strong)] bg-[var(--surface-muted)] p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-sm font-semibold text-[var(--accent-foreground)]">1</span>
              <h3 className="section-title">Informasi Customer</h3>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="form-field relative">
                <label className="form-label" htmlFor="customerPhone">
                  Telepon pelanggan
                </label>
                <div className="relative">
                  <Input id="customerPhone" placeholder="Contoh: 08123456789" {...register("customerPhone")} />
                  <div className="absolute inset-y-0 right-3 flex items-center">
                    {isLookingUpCustomer ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
                    ) : customerLookupStatus === "found" ? (
                      <Check className="h-4 w-4 text-emerald-400" />
                    ) : (
                      <Search className="h-4 w-4 text-muted-foreground/50" />
                    )}
                  </div>
                </div>
                {customerLookupStatus === "found" && (
                  <p className="text-xs text-emerald-400 font-medium">Customer ditemukan. Nama otomatis diisi.</p>
                )}
                {customerLookupStatus === "not_found" && (
                  <p className="text-xs text-muted-foreground">Customer baru akan dibuat otomatis.</p>
                )}
              </div>
              <div className="form-field">
                <label className="form-label" htmlFor="customerName">
                  Nama pelanggan <span className="text-[var(--danger)]">*</span>
                </label>
                <Input id="customerName" placeholder="Contoh: Sinta" {...register("customerName")} />
                {formState.errors.customerName ? (
                  <p className="form-helper text-[var(--danger)]">{formState.errors.customerName.message}</p>
                ) : null}
              </div>
            </div>
          </div>

          {/* Services Section */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[color:var(--border)] pb-2">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-sm font-semibold text-[var(--accent)]">2</span>
                <p className="section-title">Layanan / Produk</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="shrink-0"
                onClick={() => appendService({ employeeIds: [], serviceId: "" })}
              >
                <Plus className="mr-1.5 h-3 w-3" />
                Tambah layanan
              </Button>
            </div>

            <div className="space-y-4">
              {serviceFields.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">Belum ada layanan ditambahkan.</p>
              ) : null}
              
              {serviceFields.map((field, index) => {
                const item = watchedServices?.[index];
                const service = serviceMap.get(item?.serviceId ?? "");
                const employeeIds = item?.employeeIds ?? [];
                const selectedEmployees = employeeIds
                  .map((employeeId) => employeeMap.get(employeeId))
                  .filter(Boolean) as EmployeeRow[];
                const defaultPrice = Number(service?.price ?? 0);
                const finalPrice = item?.finalPrice ?? defaultPrice;
                const splitBase = employeeIds.length ? finalPrice / employeeIds.length : 0;
                const commissionRows = selectedEmployees.map((employee) => ({
                  amount: (splitBase * Number(employee.commission_rate ?? 0)) / 100,
                  effectiveRate: employeeIds.length
                    ? Number(employee.commission_rate ?? 0) / employeeIds.length
                    : 0,
                  employee,
                }));
                const commissionAmount = commissionRows.reduce((sum, row) => sum + row.amount, 0);

                return (
                  <div key={field.id} className="theme-card-muted grid gap-4 p-4 relative">
                    <div className="absolute top-2 right-2">
                      <Button variant="ghost" size="sm" className="h-8 w-8 min-h-0 p-0 text-muted-foreground hover:text-[var(--danger)]" onClick={() => removeService(index)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="grid gap-4 md:grid-cols-2 pr-6">
                      <div className="form-field">
                        <label className="form-label">Layanan</label>
                        <Controller
                          control={control}
                          name={`services.${index}.serviceId`}
                          render={({ field: controllerField }) => (
                            <ServiceSelector
                              services={services}
                              value={controllerField.value}
                              onChange={controllerField.onChange}
                            />
                          )}
                        />
                        {formState.errors.services?.[index]?.serviceId ? (
                          <p className="form-helper text-[var(--danger)]">
                            {formState.errors.services[index]?.serviceId?.message}
                          </p>
                        ) : null}
                      </div>
                      <div className="form-field">
                        <label className="form-label">Karyawan</label>
                        <Controller
                          control={control}
                          name={`services.${index}.employeeIds`}
                          render={({ field: controllerField }) => (
                            <EmployeeMultiSelector
                              employees={employees}
                              value={controllerField.value ?? []}
                              onChange={controllerField.onChange}
                            />
                          )}
                        />
                        {formState.errors.services?.[index]?.employeeIds ? (
                          <p className="form-helper text-[var(--danger)]">
                            {formState.errors.services[index]?.employeeIds?.message}
                          </p>
                        ) : null}
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-3 bg-[var(--surface-elevated)] p-3 rounded-xl border border-[color:var(--border)] mt-2">
                      <div className="form-field">
                        <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                          <Tag className="w-3 h-3" /> Harga (Bisa diubah)
                        </label>
                        <Controller
                          control={control}
                          name={`services.${index}.finalPrice`}
                          render={({ field: controllerField }) => (
                            <CurrencyInput
                              value={controllerField.value ?? defaultPrice}
                              onValueChange={controllerField.onChange}
                              className="h-9 min-h-0 text-sm"
                            />
                          )}
                        />
                        {finalPrice !== defaultPrice && (
                          <span className="text-[10px] text-[var(--warning)] font-medium">
                            Harga asli: {formatRupiah(defaultPrice)}
                          </span>
                        )}
                      </div>
                      <div className="form-field">
                        <label className="text-xs font-semibold text-muted-foreground">Alasan Ubah Harga</label>
                        <Input 
                          placeholder="Cth: Promo, Diskon" 
                          {...register(`services.${index}.priceAdjustmentReason`)}
                          className="h-9 min-h-0 text-sm"
                          disabled={finalPrice === defaultPrice}
                        />
                      </div>
                      {canViewCommission ? (
                        <div className="form-field">
                          <label className="text-xs font-semibold text-muted-foreground">Komisi estimasi</label>
                          <div className="space-y-1 text-sm">
                            {commissionRows.length ? (
                              commissionRows.map((row) => (
                                <div key={row.employee.id} className="flex justify-between gap-2">
                                  <span className="text-muted-foreground">
                                    {row.employee.name} ({formatCommissionRate(row.effectiveRate)}%)
                                  </span>
                                  <span className="font-medium text-[var(--gold)]">
                                    {formatRupiah(row.amount)}
                                  </span>
                                </div>
                              ))
                            ) : (
                              <span className="text-muted-foreground">Pilih karyawan</span>
                            )}
                            <div className="border-t border-[color:var(--border)] pt-1 font-semibold text-[var(--gold)]">
                              Total {formatRupiah(commissionAmount)}
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Products Section */}
          {supportsProducts && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[color:var(--border)] pb-2">
                <div>
                  <p className="section-title">Detail produk</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  onClick={() => appendProduct({ productId: "", qty: 1 })}
                >
                  <Plus className="mr-1.5 h-3 w-3" />
                  Tambah produk
                </Button>
              </div>

              <div className="space-y-4">
                 {productFields.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">Belum ada produk ditambahkan.</p>
                ) : null}

                {productFields.map((field, index) => {
                  const item = watchedProducts?.[index];
                  const product = productMap.get(item?.productId ?? "");
                  const price = Number(product?.price ?? 0);
                  const subtotal = price * (item?.qty || 1);

                  return (
                    <div key={field.id} className="theme-card-muted flex flex-col sm:flex-row gap-4 p-4 relative items-end sm:items-center">
                       <div className="absolute top-2 right-2 sm:hidden">
                        <Button variant="ghost" size="sm" className="h-8 w-8 min-h-0 p-0 text-muted-foreground hover:text-[var(--danger)]" onClick={() => removeProduct(index)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="form-field flex-1 w-full pr-6 sm:pr-0">
                        <label className="form-label">Produk</label>
                        <Controller
                          control={control}
                          name={`products.${index}.productId`}
                          render={({ field: controllerField }) => (
                            <ProductSelector
                              products={products}
                              value={controllerField.value}
                              onChange={controllerField.onChange}
                            />
                          )}
                        />
                         {formState.errors.products?.[index]?.productId ? (
                            <p className="form-helper text-[var(--danger)]">
                              {formState.errors.products[index]?.productId?.message}
                            </p>
                          ) : null}
                      </div>
                      
                      <div className="flex gap-4 w-full sm:w-auto items-end">
                        <div className="form-field w-24">
                          <label className="form-label">Qty</label>
                          <Input
                            type="number"
                            min="1"
                            {...register(`products.${index}.qty`, { valueAsNumber: true })}
                          />
                        </div>
                        
                        <div className="form-field flex-1 sm:w-32">
                          <label className="form-label">Subtotal</label>
                          <div className="form-input flex items-center bg-transparent border-transparent px-0 font-medium text-foreground">
                            {formatRupiah(subtotal)}
                          </div>
                        </div>

                        <Button variant="ghost" className="hidden sm:flex h-11 w-11 min-h-0 p-0 text-muted-foreground hover:text-[var(--danger)]" onClick={() => removeProduct(index)}>
                          <Trash2 className="h-5 w-5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
          {typeof formState.errors.services?.message === "string" ? (
            <p className="form-helper text-[var(--danger)]">{formState.errors.services.message}</p>
          ) : null}
          {typeof formState.errors.products?.message === "string" ? (
            <p className="form-helper text-[var(--danger)]">{formState.errors.products.message}</p>
          ) : null}
          {formState.errors.root?.message ? (
             <p className="form-helper text-[var(--danger)]">{formState.errors.root.message}</p>
          ) : null}

          {/* Payment Section */}
          <div className="grid gap-4 md:grid-cols-2 pt-4 border-t border-[color:var(--border)]">
            <div className="form-field">
              <div className="mb-1 flex items-center gap-3 md:col-span-2">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-sm font-semibold text-[var(--accent)]">3</span>
                <p className="section-title">Pembayaran</p>
              </div>
              <label className="form-label" htmlFor="paymentMethod">
                Metode pembayaran
              </label>
              <Select id="paymentMethod" {...register("paymentMethod")}>
                {PAYMENT_METHOD_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
              {formState.errors.paymentMethod ? (
                <p className="form-helper text-[var(--danger)]">{formState.errors.paymentMethod.message}</p>
              ) : null}
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="transactionNotes">
                Catatan (Opsional)
              </label>
              <Input id="transactionNotes" placeholder="Catatan transaksi..." {...register("notes")} />
            </div>
          </div>

          {submitError ? (
            <div className="rounded-xl border border-[color:var(--danger)]/20 bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)]">
              {submitError}
            </div>
          ) : null}

          <div className="flex justify-end pt-4">
            <Button disabled={isSubmitting || (serviceFields.length === 0 && productFields.length === 0)} type="submit" className="w-full sm:w-auto px-8">
              {isSubmitting ? "Menyimpan..." : "Simpan transaksi"}
            </Button>
          </div>
        </form>
      </Card>

      <div className="space-y-6 xl:sticky xl:top-6 xl:self-start">
        <div className="flex items-center gap-3 xl:hidden">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-sm font-semibold text-[var(--accent)]">4</span>
          <p className="section-title">Ringkasan</p>
        </div>
        <SummaryCard
          paymentMethod={watchedPaymentMethod}
          showCommission={canViewCommission}
          totalAmount={totals.totalAmount}
          subtotalAmount={totals.subtotal}
          taxAmount={totals.taxAmount}
          serviceChargeAmount={totals.serviceChargeAmount}
          taxPercentage={taxPercentage}
          serviceChargePercentage={serviceChargePercentage}
          totalCommission={totals.totalCommission}
          totalProducts={totals.totalProducts}
          totalServices={totals.totalServices}
        />
        <Card>
          <CardHeader className="px-0">
            <CardTitle>Catatan validasi</CardTitle>
            <CardDescription>
              Transaksi harus memiliki minimal 1 layanan atau 1 produk.
            </CardDescription>
          </CardHeader>
          <ul className="space-y-3 text-sm leading-6 text-muted-foreground list-disc pl-4">
            <li>Nama pelanggan wajib diisi. Masukkan nomor telepon untuk fitur pencarian otomatis.</li>
            <li>Komisi dihitung berdasarkan Harga Final, bukan Harga Asli.</li>
            <li>Harga yang diubah akan disimpan secara permanen bersama alasan yang diberikan.</li>
          </ul>
        </Card>
      </div>

      <div className="no-print fixed inset-x-0 bottom-[68px] z-20 border-t border-[color:var(--border)] bg-[var(--background)]/95 px-4 py-3 shadow-[0_-18px_35px_-28px_rgba(0,0,0,0.6)] backdrop-blur-xl xl:hidden">
        <div className="mx-auto flex max-w-screen-sm items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-muted-foreground">
              {totals.totalItems} item / layanan
            </p>
            <p className="truncate text-base font-semibold text-foreground">{formatRupiah(totals.totalAmount)}</p>
          </div>
          <Button
            className="shrink-0 px-4"
            disabled={isSubmitting || (serviceFields.length === 0 && productFields.length === 0)}
            form="transaction-form"
            type="submit"
          >
            {isSubmitting ? "Menyimpan..." : "Simpan transaksi"}
          </Button>
        </div>
      </div>
    </div>
  );
}
