"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PackagePlus, RefreshCw, X } from "lucide-react";

import { DataTable } from "@/components/ui/data-table";
import { LoadingState } from "@/components/ui/loading-state";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import type { ProductRow, SupplierRow } from "@/lib/types/app";

export function StockLevels({ businessId }: { businessId: string }) {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [selectedProduct, setSelectedProduct] = useState<ProductRow | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    movementType: "in",
    quantity: "",
    notes: "",
    supplierId: "",
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProducts();
    fetchSuppliers();
  }, [businessId]);

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/products?businessId=${businessId}`);
      if (res.ok) {
        const { data } = await res.json();
        setProducts(data?.filter((p: ProductRow) => p.track_stock) || []);
      }
    } catch (error) {
      console.error("Failed to fetch products:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const res = await fetch(`/api/inventory/suppliers?businessId=${businessId}`);
      if (res.ok) {
        const { data } = await res.json();
        setSuppliers(data || []);
      }
    } catch (error) {
      console.error("Failed to fetch suppliers:", error);
    }
  };

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    
    setError(null);
    setIsSubmitting(true);
    
    try {
      let finalQuantity = Number(form.quantity);
      if (form.movementType === "out" || form.movementType === "void_return") {
        finalQuantity = -Math.abs(finalQuantity);
      } else {
        finalQuantity = Math.abs(finalQuantity);
      }

      if (finalQuantity === 0) {
        throw new Error("Kuantitas tidak boleh 0");
      }

      // Check if reducing goes below zero
      if (finalQuantity < 0 && selectedProduct.current_stock + finalQuantity < 0) {
        throw new Error(`Stok tidak mencukupi. Maksimal pengurangan: ${selectedProduct.current_stock}`);
      }

      const res = await fetch("/api/inventory/movements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId,
          productId: selectedProduct.id,
          movementType: form.movementType,
          quantity: finalQuantity,
          notes: form.notes,
          supplierId: form.supplierId || null,
        }),
      });

      const json = await res.json();
      
      if (!res.ok || json.error) {
        throw new Error(json.error || "Gagal menyesuaikan stok");
      }

      // Reset and refresh
      setSelectedProduct(null);
      setForm({ movementType: "in", quantity: "", notes: "", supplierId: "" });
      fetchProducts();
    } catch (err: any) {
      setError(err.message || "Gagal menyesuaikan stok");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <LoadingState message="Memuat data stok..." />;

  return (
    <div className="flex flex-col gap-6">
      <Card className="theme-card glow-ring">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div>
            <CardTitle className="text-xl">Status Stok Terkini</CardTitle>
            <CardDescription>Pantau level stok produk dan lakukan penyesuaian jika diperlukan.</CardDescription>
          </div>
          <Link
            href="/products"
            className="hidden sm:inline-flex items-center justify-center whitespace-nowrap font-semibold min-h-11 px-4 py-2 text-sm rounded-xl border border-[color:var(--accent)] bg-transparent text-[var(--accent)] hover:bg-[var(--accent-soft)] transition-colors"
          >
            <PackagePlus className="mr-2 h-4 w-4" />
            Kelola Master Produk
          </Link>
        </CardHeader>
        
        <div className="p-1">
          <DataTable<ProductRow>
            columns={[
              { key: "sku", label: "SKU", render: (row) => <span className="font-mono text-xs text-muted-foreground">{row.sku || "-"}</span> },
              { key: "name", label: "Nama Produk", render: (row) => <span className="font-semibold">{row.name}</span> },
              { key: "category", label: "Kategori", render: (row) => <span className="text-muted-foreground">{row.category || "-"}</span> },
              { 
                key: "current_stock", 
                label: "Sisa Stok",
                render: (row) => {
                  const stock = Number(row.current_stock);
                  const minStock = Number(row.minimum_stock || 5);
                  
                  if (stock <= 0) return <Badge tone="danger" className="animate-pulse">Habis ({stock})</Badge>;
                  if (stock <= minStock) return <Badge tone="warning">Menipis ({stock})</Badge>;
                  return <Badge tone="success">Aman ({stock})</Badge>;
                }
              },
              { 
                key: "actions", 
                label: "Aksi",
                render: (row) => (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-8 rounded-lg text-xs"
                    onClick={() => {
                      setSelectedProduct(row);
                      setForm({ movementType: "in", quantity: "", notes: "", supplierId: "" });
                      setError(null);
                    }}
                  >
                    <RefreshCw className="mr-1 h-3 w-3" />
                    Sesuaikan
                  </Button>
                )
              }
            ]}
            rows={products}
            rowKey={(row) => row.id}
            emptyMessage="Belum ada produk yang mengaktifkan fitur lacak stok."
          />
        </div>
      </Card>

      {/* Manual Stock Adjustment Modal Overlay */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <Card className="theme-card glow-ring w-full max-w-lg shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <CardHeader className="flex flex-row items-center justify-between border-b border-border/30 pb-4">
              <div>
                <CardTitle>Sesuaikan Stok</CardTitle>
                <CardDescription>Produk: <span className="font-bold text-foreground">{selectedProduct.name}</span> (Stok Saat Ini: {selectedProduct.current_stock})</CardDescription>
              </div>
              <Button variant="ghost" size="icon" className="rounded-full h-8 w-8" onClick={() => setSelectedProduct(null)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <div className="p-6">
              <form onSubmit={handleAdjustStock} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="form-field">
                    <label className="form-label">Jenis Penyesuaian</label>
                    <Select 
                      required
                      value={form.movementType}
                      onValueChange={(val) => setForm({ ...form, movementType: val })}
                    >
                      <SelectTrigger className="h-11 w-full">
                        <SelectValue placeholder="Pilih Jenis" />
                      </SelectTrigger>
                      <SelectContent className="z-50">
                        <SelectItem value="in">Tambah Stok (IN)</SelectItem>
                        <SelectItem value="out">Kurangi Stok (OUT)</SelectItem>
                        <SelectItem value="adjustment">Koreksi Manual (ADJUSTMENT)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="form-field">
                    <label className="form-label">Kuantitas</label>
                    <Input 
                      className="h-11"
                      type="number"
                      required
                      min="1"
                      placeholder="Cth: 10"
                      value={form.quantity}
                      onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                    />
                  </div>
                </div>

                {form.movementType === "in" && suppliers.length > 0 && (
                  <div className="form-field animate-in fade-in slide-in-from-top-2">
                    <label className="form-label">Supplier (Opsional)</label>
                    <Select 
                      value={form.supplierId || "none"}
                      onValueChange={(val) => setForm({ ...form, supplierId: val === "none" ? "" : val })}
                    >
                      <SelectTrigger className="h-11 w-full">
                        <SelectValue placeholder="Pilih Supplier..." />
                      </SelectTrigger>
                      <SelectContent className="z-50">
                        <SelectItem value="none">Pilih Supplier...</SelectItem>
                        {suppliers.map(s => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="form-field">
                  <label className="form-label">Catatan Alasan</label>
                  <Textarea 
                    className="min-h-[80px] rounded-xl"
                    placeholder="Cth: Barang masuk dari supplier, Produk rusak..."
                    required
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  />
                </div>

                {error && (
                  <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-xs text-rose-400">
                    {error}
                  </div>
                )}

                <div className="pt-2 flex justify-end gap-3">
                  <Button 
                    type="button" 
                    variant="ghost" 
                    className="h-11"
                    onClick={() => setSelectedProduct(null)}
                  >
                    Batal
                  </Button>
                  <Button 
                    type="submit" 
                    className="h-11 glow-accent font-bold px-8"
                    disabled={isSubmitting || !form.quantity || !form.notes}
                  >
                    {isSubmitting ? "Memproses..." : "Simpan Penyesuaian"}
                  </Button>
                </div>
              </form>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
