import { Select } from "@/components/ui/select";
import type { ServiceRow } from "@/lib/types/app";

export function ServiceSelector({
  name,
  onChange,
  services,
  value,
}: {
  name?: string;
  onChange?: (value: string) => void;
  services: ServiceRow[];
  value?: string;
}) {
  return (
    <Select
      name={name}
      value={value}
      onChange={(event) => onChange?.(event.target.value)}
    >
      <option value="">Pilih layanan</option>
      {services.map((service) => (
        <option key={service.id} value={service.id}>
          {service.name}
        </option>
      ))}
    </Select>
  );
}
