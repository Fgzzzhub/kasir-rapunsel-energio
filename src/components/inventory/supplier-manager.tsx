"use client";

import { Plus, Pencil, Trash } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/ui/data-table";
import { LoadingState } from "@/components/ui/loading-state";
import { Badge } from "@/components/ui/badge";
import type { SupplierRow } from "@/lib/types/app";

export function SupplierManager({ businessId }: { businessId: string }) {
  const [suppliers, setSuppliers] = useState<SupplierRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<SupplierRow | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [contactInfo, setContactInfo] = useState("");
  const [address, setAddress] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchSuppliers();
  }, [businessId]);

  const fetchSuppliers = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/inventory/suppliers?businessId=${businessId}`);
      if (res.ok) {
        const { data } = await res.json();
        setSuppliers(data || []);
      }
    } catch (error) {
      console.error("Failed to fetch suppliers:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenForm = (supplier?: SupplierRow) => {
    if (supplier) {
      setEditingSupplier(supplier);
      setName(supplier.name);
      setContactInfo(supplier.contact_info || "");
      setAddress(supplier.address || "");
      setIsActive(supplier.is_active);
    } else {
      setEditingSupplier(null);
      setName("");
      setContactInfo("");
      setAddress("");
      setIsActive(true);
    }
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const method = editingSupplier ? "PATCH" : "POST";
      const url = editingSupplier 
        ? `/api/inventory/suppliers/${editingSupplier.id}` 
        : `/api/inventory/suppliers`;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId,
          name,
          contactInfo,
          address,
          isActive,
        }),
      });

      if (res.ok) {
        setIsFormOpen(false);
        fetchSuppliers();
      }
    } catch (error) {
      console.error("Failed to save supplier:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <LoadingState message="Loading suppliers..." />;

  if (isFormOpen) {
    return (
      <Card className="max-w-2xl">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold">
            {editingSupplier ? "Edit Supplier" : "Add Supplier"}
          </h2>
          
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-muted-foreground">Name</label>
            <Input required value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-muted-foreground">Contact Info</label>
            <Input value={contactInfo} onChange={(e) => setContactInfo(e.target.value)} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-muted-foreground">Address</label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>

          <div className="flex items-center gap-2">
            <input 
              type="checkbox" 
              checked={isActive} 
              onChange={(e) => setIsActive(e.target.checked)} 
              id="isActive"
            />
            <label htmlFor="isActive" className="text-sm">Active</label>
          </div>

          <div className="mt-4 flex gap-3">
            <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Supplier"}
            </Button>
          </div>
        </form>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Suppliers</h2>
        <Button variant="primary" onClick={() => handleOpenForm()}>
          <Plus className="mr-2 h-4 w-4" />
          Add Supplier
        </Button>
      </div>

      <DataTable<SupplierRow>
        columns={[
          { key: "name", label: "Name" },
          { key: "contact_info", label: "Contact" },
          { key: "address", label: "Address" },
          { 
            key: "is_active", 
            label: "Status",
            render: (row) => (
              <Badge tone={row.is_active ? "success" : "neutral"}>
                {row.is_active ? "Active" : "Inactive"}
              </Badge>
            )
          },
          {
            key: "actions",
            label: "Actions",
            render: (row) => (
              <Button variant="ghost" size="sm" onClick={() => handleOpenForm(row)}>
                <Pencil className="h-4 w-4" />
              </Button>
            )
          }
        ]}
        rows={suppliers}
        rowKey={(row) => row.id}
        emptyMessage="No suppliers added yet."
      />
    </div>
  );
}
