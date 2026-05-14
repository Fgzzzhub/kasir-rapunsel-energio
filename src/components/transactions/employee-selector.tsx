import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { EmployeeRow } from "@/lib/types/app";

export function EmployeeSelector({
  employees,
  name,
  onChange,
  value,
}: {
  employees: EmployeeRow[];
  name?: string;
  onChange?: (value: string) => void;
  value?: string;
}) {
  return (
    <Select
      name={name}
      value={value}
      onValueChange={(val) => onChange?.(val)}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Pilih karyawan..." />
      </SelectTrigger>
      <SelectContent className="z-50">
        {employees.map((employee) => (
          <SelectItem key={employee.id} value={employee.id}>
            {employee.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
