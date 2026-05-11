import type { ReactNode } from "react";

import { Card } from "@/components/ui/card";

type EmptyStateProps = {
  action?: ReactNode;
  title: string;
  description: string;
};

export function EmptyState({ action, description, title }: EmptyStateProps) {
  return (
    <Card className="flex min-h-52 flex-col items-center justify-center text-center">
      <h3 className="text-2xl font-semibold">{title}</h3>
      <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </Card>
  );
}
