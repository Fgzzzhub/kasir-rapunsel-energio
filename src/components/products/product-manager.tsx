"use client";

import { useMemo, useState } from "react";
import { MoreVertical, PencilLine, Plus, Power, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { CurrencyInput } from "@/components/ui/currency-input";
import { DataTable } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { RupiahFormatter } from "@/components/ui/rupiah-formatter";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuPortal, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import type { ProductRow } from "@/lib/types/app";

type ProductManagerProps = {
  businessId: string;
  canManage: boolean;
  initialProducts: ProductRow[];
};

type ProductFormState = {
  category: string;
  description: string;
  isActive: boolean;
  name: string;
  price: number;
  sku: string;
  trackStock: boolean;
  costPrice: number;
  minimumStock: number;
  initialStock: number;
};

const emptyFormState: ProductFormState = {
  category: "",
  description: "",
  isActive: true,
  name: "",
  price: 0,
  sku: "",
  trackStock: false,
  costPrice: 0,
  minimumStock: 5,
  initialStock: 0,
};

function sortProducts(products: ProductRow[]) {
  return [...products].sort((left, right) => {
    if (left.is_active !== right.is_active) {
      return left.is_active ? -1 : 1;
    }
    return left.name.localeCompare(right.name, "id-ID");
  });
}

export function ProductManager({
  businessId,
  canManage,
  initialProducts,
}: ProductManagerProps) {
  const [products] = useState(sortProducts(initialProducts));
  const [search, setSearch] = useState("");
  const [editingProduct, setEditingProduct] = useState<ProductRow | null>(null);
  const [form, setForm] = useState<ProductFormState>(emptyFormState);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingToggle, setPendingToggle] = useState<ProductRow | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ProductRow | null>(null);

  const filteredProducts = useMemo(() => {
    if (!search.trim()) {
      return products;
    }
    const query = search.trim().toLowerCase();
    return products.filter((product) =>
      [product.name, product.category ?? "", product.sku ?? "", product.description ?? ""].some((value) =>
        value.toLowerCase().includes(query),
      ),
    );
  }, [search, products]);

  function resetForm() {
    setEditingProduct(null);
    setForm(emptyFormState);
  }

  function hydrateForm(product: ProductRow) {
    setEditingProduct(product);
    setForm({
      category: product.category ?? "",
      description: product.description ?? "",
      isActive: product.is_active,
      name: product.name,
      price: Number(product.price),
      sku: product.sku ?? "",
      trackStock: product.track_stock ?? false,
      costPrice: Number(product.cost_price ?? 0),
      minimumStock: Number(product.minimum_stock ?? 5),
      initialStock: 0,
    });
    setStatusMessage(null);
    setErrorMessage(null);
  }

  async function upsertProduct(nextForm: ProductFormState, productId?: string) {
    setIsSubmitting(true);
    setStatusMessage(null);
    setErrorMessage(null);

    const response = await fetch(productId ? `/api/products/${productId}` : "/api/products", {
      body: JSON.stringify({
        businessId,
        category: nextForm.category,
        description: nextForm.description,
        isActive: nextForm.isActive,
        name: nextForm.name,
        price: nextForm.price,
        sku: nextForm.sku,
        trackStock: nextForm.trackStock,
        costPrice: nextForm.costPrice,
        minimumStock: nextForm.minimumStock,
        initialStock: editingProduct ? 0 : nextForm.initialStock,
      }),
      headers: {
        "Content-Type": "application/json",
      },
      method: productId ? "PATCH" : "POST",
    });

    const payload = (await response.json()) as {
      success?: boolean;
      error?: string;
    };

    setIsSubmitting(false);

    if (!response.ok || !payload.success) {
      setErrorMessage(payload.error ?? "Gagal menyimpan produk.");
      return;
    }

    // Refresh data using window.location.reload() for simplicity, or we could mutate state
    // but the API doesn't return the inserted row like services did. We'll just refresh.
    window.location.reload();
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
      <Card>
        <CardHeader className="px-0">
          <CardTitle>Daftar produk</CardTitle>
          <CardDescription>
            Kelola stok dan harga produk fisik untuk bisnis yang sedang dipilih.
          </CardDescription>
        </CardHeader>
        <div className="mb-4">
          <Input
            placeholder="Cari produk..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <DataTable
          columns={[
            {
              key: "name",
              label: "Produk",
              render: (product) => (
                <div className="space-y-1">
                  <p className="font-semibold">{product.name}</p>
                  <p className="text-xs leading-5 text-muted-foreground">
                    {product.category || "Tanpa kategori"} {product.sku ? ` • SKU: ${product.sku}` : ""}
                  </p>
                </div>
              ),
            },
            {
              key: "price",
              label: "Harga Jual",
              render: (product) => <RupiahFormatter value={product.price} />,
            },
            {
              key: "cost_price",
              label: "Modal",
              render: (product) => <RupiahFormatter value={product.cost_price ?? 0} />,
            },
            {
              key: "stock",
              label: "Stok",
              render: (product) => {
                if (!product.track_stock) return <span className="text-muted-foreground">-</span>;
                const stock = Number(product.current_stock ?? 0);
                const minStock = Number(product.minimum_stock ?? 5);
                if (stock <= 0) return <Badge tone="danger" className="animate-pulse">Habis ({stock})</Badge>;
                if (stock <= minStock) return <Badge tone="warning">Menipis ({stock})</Badge>;
                return <Badge tone="success">Aman ({stock})</Badge>;
              }
            },
            {
              key: "is_active",
              label: "Status",
              render: (product) => (
                <span className={product.is_active ? "theme-pill" : "theme-pill opacity-60"}>
                  {product.is_active ? "Aktif" : "Nonaktif"}
                </span>
              ),
            },
            {
              key: "actions",
              label: "Aksi",
              render: (product) =>
                canManage ? (
                  <div className="flex items-center justify-end gap-1">
                    <Tooltip content="Edit">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9"
                        onClick={() => hydrateForm(product)}
                      >
                        <PencilLine className="h-4 w-4" />
                      </Button>
                    </Tooltip>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-[var(--surface-hover)] hover:text-foreground">
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuPortal>
                        <DropdownMenuContent align="end" className="z-50">
                          <DropdownMenuItem
                            onClick={() => setPendingToggle(product)}
                          >
                            <Power className="h-4 w-4" />
                            {product.is_active ? "Nonaktifkan" : "Aktifkan"}
                          </DropdownMenuItem>
                          {product.is_active ? (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                destructive
                                onClick={() => setPendingDelete(product)}
                              >
                                <Trash2 className="h-4 w-4" />
                                Hapus
                              </DropdownMenuItem>
                            </>
                          ) : null}
                        </DropdownMenuContent>
                      </DropdownMenuPortal>
                    </DropdownMenu>
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">Lihat saja</span>
                ),
            },
          ]}
          emptyMessage="Belum ada produk untuk bisnis ini."
          rowKey={(product) => product.id}
          rows={filteredProducts}
        />
      </Card>

      <Card>
        <CardHeader className="px-0">
          <CardTitle>{editingProduct ? "Ubah produk" : "Tambah produk"}</CardTitle>
          <CardDescription>
            Harga digunakan sebagai referensi default saat penjualan produk di transaksi.
          </CardDescription>
        </CardHeader>

        {canManage ? (
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              void upsertProduct(form, editingProduct?.id);
            }}
          >
            <div className="form-field">
              <label className="form-label" htmlFor="productName">
                Nama produk
              </label>
              <Input
                id="productName"
                required
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({ ...current, name: event.target.value }))
                }
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="form-field">
                <label className="form-label" htmlFor="productCategory">
                  Kategori
                </label>
                <Input
                  id="productCategory"
                  value={form.category}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, category: event.target.value }))
                  }
                />
              </div>
              <div className="form-field">
                <label className="form-label" htmlFor="productSku">
                  SKU
                </label>
                <Input
                  id="productSku"
                  value={form.sku}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, sku: event.target.value }))
                  }
                />
              </div>
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="productDescription">
                Deskripsi
              </label>
              <Textarea
                id="productDescription"
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({ ...current, description: event.target.value }))
                }
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="form-field">
                <label className="form-label" htmlFor="productCostPrice">
                  Harga Modal (HPP)
                </label>
                <CurrencyInput
                  id="productCostPrice"
                  required
                  value={form.costPrice}
                  onValueChange={(value) =>
                    setForm((current) => ({ ...current, costPrice: value }))
                  }
                />
              </div>
              <div className="form-field">
                <label className="form-label" htmlFor="productPrice">
                  Harga Jual
                </label>
                <CurrencyInput
                  id="productPrice"
                  required
                  value={form.price}
                  onValueChange={(value) =>
                    setForm((current) => ({ ...current, price: value }))
                  }
                />
              </div>
            </div>

            <div className="rounded-2xl border border-[color:var(--border)] bg-[var(--surface-muted)] p-4 space-y-4">
              <label className="flex items-center gap-3 text-sm font-medium cursor-pointer">
                <input
                  checked={form.trackStock}
                  className="h-5 w-5 rounded-lg border-[color:var(--border)] bg-[var(--surface-elevated)] text-[var(--accent)] transition-all focus:ring-[var(--accent)]/30 cursor-pointer"
                  type="checkbox"
                  onChange={(event) =>
                    setForm((current) => ({ ...current, trackStock: event.target.checked }))
                  }
                />
                Lacak Stok & Inventaris
              </label>

              {form.trackStock && (
                <div className="grid gap-4 sm:grid-cols-2 pt-2 animate-in fade-in slide-in-from-top-2">
                  <div className="form-field">
                    <label className="form-label" htmlFor="productMinStock">Batas Minimum Stok</label>
                    <Input
                      id="productMinStock"
                      type="number"
                      min="0"
                      required
                      value={form.minimumStock}
                      onChange={(event) => setForm((current) => ({ ...current, minimumStock: Number(event.target.value) }))}
                    />
                  </div>
                  {!editingProduct && (
                    <div className="form-field">
                      <label className="form-label" htmlFor="productInitialStock">Stok Awal</label>
                      <Input
                        id="productInitialStock"
                        type="number"
                        min="0"
                        required
                        value={form.initialStock}
                        onChange={(event) => setForm((current) => ({ ...current, initialStock: Number(event.target.value) }))}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <label className="flex items-center gap-3 rounded-2xl border border-[color:var(--border)] bg-[var(--surface-muted)] px-4 py-3 text-sm font-medium">
              <input
                checked={form.isActive}
                className="h-4 w-4"
                type="checkbox"
                onChange={(event) =>
                  setForm((current) => ({ ...current, isActive: event.target.checked }))
                }
              />
              Aktifkan produk ini
            </label>
            {errorMessage ? (
              <div className="rounded-2xl border border-[color:var(--danger)]/20 bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)]">
                {errorMessage}
              </div>
            ) : null}
            {statusMessage ? (
              <div className="rounded-2xl border border-emerald-500/20 bg-[var(--success-soft)] px-4 py-3 text-sm text-emerald-400">
                {statusMessage}
              </div>
            ) : null}
            <div className="flex flex-wrap gap-3">
              <Button disabled={isSubmitting || form.price <= 0} type="submit">
                {editingProduct ? "Simpan perubahan" : "Tambah produk"}
              </Button>
              {editingProduct ? (
                <Button variant="secondary" onClick={resetForm}>
                  Batal edit
                </Button>
              ) : (
                <Button variant="secondary" onClick={resetForm}>
                  <Plus className="mr-2 h-4 w-4" />
                  Reset
                </Button>
              )}
            </div>
          </form>
        ) : (
          <div className="rounded-2xl border border-[color:var(--border)] bg-[var(--surface-muted)] px-4 py-5 text-sm leading-6 text-muted-foreground">
            Admin hanya dapat melihat daftar produk.
          </div>
        )}
      </Card>

      <ConfirmDialog
        confirmLabel={pendingToggle?.is_active ? "Nonaktifkan" : "Aktifkan"}
        description={
          pendingToggle?.is_active
            ? "Produk nonaktif tidak muncul di form transaksi baru."
            : "Produk akan kembali tersedia di transaksi baru."
        }
        open={Boolean(pendingToggle)}
        title={`${pendingToggle?.is_active ? "Nonaktifkan" : "Aktifkan"} produk`}
        onClose={() => setPendingToggle(null)}
        onConfirm={() => {
          if (!pendingToggle) {
            return;
          }

          void upsertProduct(
            {
              category: pendingToggle.category ?? "",
              description: pendingToggle.description ?? "",
              isActive: !pendingToggle.is_active,
              name: pendingToggle.name,
              price: Number(pendingToggle.price),
              sku: pendingToggle.sku ?? "",
              trackStock: pendingToggle.track_stock ?? false,
              costPrice: Number(pendingToggle.cost_price ?? 0),
              minimumStock: Number(pendingToggle.minimum_stock ?? 5),
              initialStock: 0,
            },
            pendingToggle.id,
          );
        }}
      />

      <ConfirmDialog
        confirmLabel="Hapus Produk"
        description={`Anda akan menghapus produk "${pendingDelete?.name ?? ""}". Data stok dan riwayat penjualan tetap aman, tetapi produk tidak akan muncul di transaksi baru.`}
        open={Boolean(pendingDelete)}
        title="Hapus produk?"
        variant="danger"
        onClose={() => setPendingDelete(null)}
        onConfirm={() => {
          if (!pendingDelete) {
            return;
          }

          void upsertProduct(
            {
              category: pendingDelete.category ?? "",
              description: pendingDelete.description ?? "",
              isActive: false,
              name: pendingDelete.name,
              price: Number(pendingDelete.price),
              sku: pendingDelete.sku ?? "",
              trackStock: pendingDelete.track_stock ?? false,
              costPrice: Number(pendingDelete.cost_price ?? 0),
              minimumStock: Number(pendingDelete.minimum_stock ?? 5),
              initialStock: 0,
            },
            pendingDelete.id,
          );
          setPendingDelete(null);
        }}
      />
    </div>
  );
}
