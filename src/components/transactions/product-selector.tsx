import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ProductRow } from "@/lib/types/app";
import { formatRupiah } from "@/lib/utils/currency";

export function ProductSelector({
  products,
  value,
  onChange,
}: {
  products: ProductRow[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Select value={value} onValueChange={(val) => onChange(val)}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="-- Pilih Produk --" />
      </SelectTrigger>
      <SelectContent className="z-50">
        {products.map((product) => (
          <SelectItem key={product.id} value={product.id}>
            {product.name} ({formatRupiah(product.price)})
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
