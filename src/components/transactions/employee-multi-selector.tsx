"use client";

import { X } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { EmployeeRow } from "@/lib/types/app";
import { formatCommissionRate } from "@/lib/utils/transaction-services";

export type EmployeeAssignment = {
  id: string;
  customCommissionRate?: number | null;
};

export function EmployeeMultiSelector({
  employees,
  onChange,
  value,
  canViewCommission,
}: {
  employees: EmployeeRow[];
  onChange: (value: EmployeeAssignment[]) => void;
  value: EmployeeAssignment[];
  canViewCommission?: boolean;
}) {
  const selectedEmployeeIds = value.map(v => v.id);
  const selectedEmployees = employees.filter((employee) => selectedEmployeeIds.includes(employee.id));
  const availableEmployees = employees.filter((employee) => !selectedEmployeeIds.includes(employee.id));

  return (
    <div className="space-y-3">
      <Select
        value=""
        onValueChange={(val) => {
          if (!val) return;
          onChange([...value, { id: val, customCommissionRate: null }]);
        }}
      >
        <SelectTrigger className="w-full bg-[var(--surface-muted)] border-[color:var(--border)] text-sm font-semibold">
          <SelectValue placeholder="Tambah karyawan..." />
        </SelectTrigger>
        <SelectContent className="z-50">
          {availableEmployees.map((employee) => (
            <SelectItem key={employee.id} value={employee.id}>
              {employee.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="grid gap-3">
        {selectedEmployees.length ? (
          selectedEmployees.map((employee) => {
            const assignment = value.find(a => a.id === employee.id);
            return (
              <div
                key={employee.id}
                className="grid gap-3 rounded-xl border border-[color:var(--border)] bg-[var(--surface-elevated)] p-3 shadow-sm"
              >
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{employee.name}</p>
                    {canViewCommission ? (
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">
                        Default {formatCommissionRate(Number(employee.commission_rate ?? 0))}%
                      </p>
                    ) : null}
                  </div>
                  <button
                    aria-label={`Hapus ${employee.name}`}
                    className="shrink-0 rounded-full p-1 text-muted-foreground transition-colors hover:bg-[color:var(--danger-soft)] hover:text-[color:var(--danger)]"
                    type="button"
                    onClick={() => onChange(value.filter((v) => v.id !== employee.id))}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                {canViewCommission && (
                  <div className="form-field min-w-0">
                    <label className="text-xs font-semibold text-muted-foreground">
                      Komisi Manual (%)
                    </label>
                    <Input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      max={100}
                      step={0.1}
                      placeholder="Kosongkan untuk default"
                      className="h-11 border-[color:var(--border-strong)] bg-[var(--surface-muted)] text-sm font-semibold placeholder:text-xs sm:placeholder:text-sm"
                      value={assignment?.customCommissionRate ?? ""}
                      onChange={(e) => {
                        const val = e.target.value ? Number(e.target.value) : null;
                        onChange(value.map(v => v.id === employee.id ? { ...v, customCommissionRate: val } : v));
                      }}
                    />
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <span className="text-xs text-muted-foreground">Belum ada karyawan dipilih.</span>
        )}
      </div>
    </div>
  );
}
