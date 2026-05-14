import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
      onValueChange={(val) => onChange?.(val)}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Pilih layanan..." />
      </SelectTrigger>
      <SelectContent className="z-50">
        {services.map((service) => (
          <SelectItem key={service.id} value={service.id}>
            {service.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
