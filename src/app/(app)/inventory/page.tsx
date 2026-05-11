import { Metadata } from "next";

import { InventoryManager } from "@/components/inventory/inventory-manager";

export const metadata: Metadata = {
  title: "Inventory | Rapunsel & Energio POS",
  description: "Manage stock levels, suppliers, and inventory movements.",
};

export default function InventoryPage() {
  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-3xl font-bold tracking-tight">Inventory</h1>
        <p className="text-muted-foreground">
          Manage your products stock, view movements, and manage suppliers.
        </p>
      </div>
      <InventoryManager />
    </div>
  );
}
