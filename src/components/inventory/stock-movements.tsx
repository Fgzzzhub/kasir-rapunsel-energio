"use client";

import { Plus } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { DataTable } from "@/components/ui/data-table";
import { LoadingState } from "@/components/ui/loading-state";
import { Badge } from "@/components/ui/badge";
import type { ProductRow, SupplierRow, StockMovementRow } from "@/lib/types/app";

export function StockMovements({ businessId }: { businessId: string }) {
  const [movements, setMovements] = useState<any[]>([]);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [productId, setProductId] = useState("");
  const [movementType, setMovementType] = useState("in");
  const [quantity, setQuantity] = useState("");
  const [notes, setNotes] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, [businessId]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [movRes, prodRes, supRes] = await Promise.all([
        fetch(`/api/inventory/movements?businessId=${businessId}`),
        fetch(`/api/products?businessId=${businessId}`),
        fetch(`/api/inventory/suppliers?businessId=${businessId}`),
      ]);

      if (movRes.ok) setMovements((await movRes.json()).data || []);
      if (prodRes.ok) setProducts((await prodRes.json()).data || []);
      if (supRes.ok) setSuppliers((await supRes.json()).data || []);
    } catch (error) {
      console.error("Failed to fetch inventory data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/inventory/movements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId,
          productId,
          movementType,
          quantity: movementType === "out" ? -Math.abs(Number(quantity)) : Number(quantity),
          notes,
          supplierId: supplierId || null,
        }),
      });

      if (res.ok) {
        setIsFormOpen(false);
        setProductId("");
        setQuantity("");
        setNotes("");
        setSupplierId("");
        fetchData();
      }
    } catch (error) {
      console.error("Failed to save movement:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <LoadingState message="Loading movements..." />;

  if (isFormOpen) {
    return (
      <Card className="max-w-2xl">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold">Record Stock Movement</h2>
          
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-muted-foreground">Product</label>
            <Select required value={productId} onChange={(e) => setProductId(e.target.value)}>
              <option value="">Select Product</option>
              {products.filter(p => p.is_active).map(p => (
                <option key={p.id} value={p.id}>{p.name} (Stock: {p.current_stock ?? 0})</option>
              ))}
            </Select>
          </div>

          <div className="flex gap-4">
            <div className="flex flex-1 flex-col gap-1.5">
              <label className="text-sm font-medium text-muted-foreground">Type</label>
              <Select required value={movementType} onChange={(e) => setMovementType(e.target.value)}>
                <option value="in">Stock In (Restock)</option>
                <option value="out">Stock Out (Spoilage/Usage)</option>
                <option value="adjustment">Adjustment (Correction)</option>
              </Select>
            </div>
            
            <div className="flex flex-1 flex-col gap-1.5">
              <label className="text-sm font-medium text-muted-foreground">Quantity</label>
              <Input 
                type="number" 
                required 
                min="1"
                value={quantity} 
                onChange={(e) => setQuantity(e.target.value)} 
                placeholder="e.g. 10"
              />
            </div>
          </div>

          {movementType === "in" && (
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-muted-foreground">Supplier (Optional)</label>
              <Select value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
                <option value="">None</option>
                {suppliers.filter(s => s.is_active).map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </Select>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-muted-foreground">Notes</label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Reason for movement..." />
          </div>

          <div className="mt-4 flex gap-3">
            <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isSubmitting || !productId}>
              {isSubmitting ? "Saving..." : "Record Movement"}
            </Button>
          </div>
        </form>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Stock Movements</h2>
        <Button variant="primary" onClick={() => setIsFormOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Record Movement
        </Button>
      </div>

      <DataTable
        columns={[
          { 
            key: "created_at", 
            label: "Date",
            render: (row: any) => new Date(row.created_at).toLocaleString()
          },
          { 
            key: "products", 
            label: "Product",
            render: (row: any) => row.products?.name || "-"
          },
          { 
            key: "movement_type", 
            label: "Type",
            render: (row: any) => {
              const type = row.movement_type as string;
              if (type === 'in') return <Badge tone="success">IN</Badge>;
              if (type === 'out') return <Badge tone="danger">OUT</Badge>;
              return <Badge tone="warning">ADJ</Badge>;
            }
          },
          { 
            key: "quantity", 
            label: "Qty",
            render: (row: any) => {
              const num = Number(row.quantity);
              return <span className={num > 0 ? "text-[var(--success)]" : "text-[var(--danger)]"}>
                {num > 0 ? `+${num}` : num}
              </span>
            }
          },
          { 
            key: "suppliers", 
            label: "Supplier",
            render: (row: any) => row.suppliers?.name || "-"
          },
          { key: "notes", label: "Notes" },
          { 
            key: "profiles", 
            label: "By",
            render: (row: any) => row.profiles?.name || "-"
          }
        ]}
        rows={movements}
        rowKey={(row: any) => row.id}
        emptyMessage="No stock movements recorded yet."
      />
    </div>
  );
}
