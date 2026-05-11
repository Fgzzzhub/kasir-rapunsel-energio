"use client";

import { Button } from "@/components/ui/button";

type ExportAction = {
  disabled?: boolean;
  href: string;
  label: string;
  variant?: "primary" | "secondary" | "ghost" | "danger" | "outline";
};

export function ReportExportButtons({ actions }: { actions: ExportAction[] }) {
  return (
    <div className="flex flex-wrap gap-3">
      {actions.map((action) => (
        <Button
          key={action.href}
          disabled={action.disabled}
          variant={action.variant ?? "secondary"}
          onClick={() => {
            window.open(action.href, "_blank", "noopener,noreferrer");
          }}
        >
          {action.label}
        </Button>
      ))}
    </div>
  );
}
