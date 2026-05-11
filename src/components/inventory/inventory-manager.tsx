"use client";

import { Box, ArrowRightLeft, Truck } from "lucide-react";
import { useState } from "react";

import { useBusinessContext } from "@/components/business/business-provider";
import { StockLevels } from "./stock-levels";
import { StockMovements } from "./stock-movements";
import { SupplierManager } from "./supplier-manager";

type Tab = "stock" | "movements" | "suppliers";

export function InventoryManager() {
  const { selectedBusiness } = useBusinessContext();
  const [activeTab, setActiveTab] = useState<Tab>("stock");

  const tabs = [
    { id: "stock", label: "Stock Levels", icon: Box },
    { id: "movements", label: "Movements", icon: ArrowRightLeft },
    { id: "suppliers", label: "Suppliers", icon: Truck },
  ] as const;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex w-full overflow-x-auto rounded-xl bg-[var(--surface-muted)] p-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as Tab)}
              className={`flex min-w-[120px] flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
                isActive
                  ? "bg-[var(--accent)] text-[var(--accent-foreground)] shadow-sm"
                  : "text-muted-foreground hover:bg-[var(--surface-hover)] hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="min-h-[500px]">
        {activeTab === "stock" && <StockLevels businessId={selectedBusiness.id} />}
        {activeTab === "movements" && <StockMovements businessId={selectedBusiness.id} />}
        {activeTab === "suppliers" && <SupplierManager businessId={selectedBusiness.id} />}
      </div>
    </div>
  );
}
