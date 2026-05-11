"use client";

import { X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import type { EmployeeRow } from "@/lib/types/app";

export function EmployeeMultiSelector({
  employees,
  onChange,
  value,
}: {
  employees: EmployeeRow[];
  onChange: (value: string[]) => void;
  value: string[];
}) {
  const selectedEmployees = employees.filter((employee) => value.includes(employee.id));
  const availableEmployees = employees.filter((employee) => !value.includes(employee.id));

  return (
    <div className="space-y-3">
      <Select
        value=""
        onChange={(event) => {
          if (!event.target.value) return;
          onChange([...value, event.target.value]);
        }}
      >
        <option value="">Tambah karyawan</option>
        {availableEmployees.map((employee) => (
          <option key={employee.id} value={employee.id}>
            {employee.name}
          </option>
        ))}
      </Select>
      <div className="flex min-h-9 flex-wrap gap-2">
        {selectedEmployees.length ? (
          selectedEmployees.map((employee) => (
            <Badge key={employee.id} className="gap-1.5 pr-1" tone="accent">
              {employee.name}
              <button
                aria-label={`Hapus ${employee.name}`}
                className="rounded-full p-0.5 hover:bg-white/10 transition-colors"
                type="button"
                onClick={() => onChange(value.filter((employeeId) => employeeId !== employee.id))}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))
        ) : (
          <span className="text-xs text-muted-foreground">Belum ada karyawan dipilih.</span>
        )}
      </div>
    </div>
  );
}
