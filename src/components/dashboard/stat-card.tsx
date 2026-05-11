import type { ReactNode } from "react";

import { Card } from "@/components/ui/card";

export function StatCard({
  caption,
  icon,
  title,
  value,
}: {
  caption: string;
  icon?: ReactNode;
  title: string;
  value: ReactNode;
}) {
  return (
    <Card className="group flex h-full flex-col justify-between gap-4 p-5 sm:p-6 transition-all hover:border-[color:var(--border-strong)]">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-muted-foreground truncate">{title}</p>
          <div className="mt-2 text-2xl font-bold tracking-tight text-foreground">{value}</div>
        </div>
        {icon ? (
          <div className="shrink-0 rounded-xl p-3 bg-[var(--accent-soft)] text-[var(--accent)] ring-1 ring-[color:rgba(232,118,154,0.12)] group-hover:shadow-lg group-hover:shadow-[var(--accent-glow)] transition-shadow">
            {icon}
          </div>
        ) : null}
      </div>
      <p className="text-sm leading-relaxed text-muted-foreground/70 mt-auto">{caption}</p>
    </Card>
  );
}
