import { Select } from "@/components/ui/select";
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
      onChange={(event) => onChange?.(event.target.value)}
    >
      <option value="">Pilih karyawan</option>
      {employees.map((employee) => (
        <option key={employee.id} value={employee.id}>
          {employee.name}
        </option>
      ))}
    </Select>
  );
}
