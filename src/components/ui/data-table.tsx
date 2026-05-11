import type { ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

type ColumnDefinition<T> = {
  align?: "left" | "right";
  className?: string;
  key: string;
  label: string;
  render?: (row: T) => ReactNode;
};

type DataTableProps<T> = {
  columns: ColumnDefinition<T>[];
  emptyMessage: string;
  rows: T[];
  rowKey: (row: T) => string;
};

export function DataTable<T>({
  columns,
  emptyMessage,
  rowKey,
  rows,
}: DataTableProps<T>) {
  return (
    <div className="table-shell overflow-x-auto">
      <table className="min-w-full border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-[color:var(--border-strong)]">
            {columns.map((column) => (
              <th
                key={column.key}
                className={cn(
                  "px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground",
                  column.align === "right" && "text-right",
                  column.className,
                )}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map((row) => (
              <tr
                key={rowKey(row)}
                className="border-b border-[color:var(--border)]/50 transition-colors hover:bg-[var(--surface-hover)] last:border-b-0"
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={cn(
                      "px-4 py-4 align-top text-foreground",
                      column.align === "right" && "text-right",
                      column.className,
                    )}
                  >
                    {column.render ? column.render(row) : String((row as Record<string, unknown>)[column.key] ?? "-")}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td className="px-4 py-12 text-center text-muted-foreground" colSpan={columns.length}>
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
