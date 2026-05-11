import { Select } from "@/components/ui/select";
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
    <Select value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="" disabled>
        -- Pilih Produk --
      </option>
      {products.map((product) => (
        <option key={product.id} value={product.id}>
          {product.name} ({formatRupiah(product.price)})
        </option>
      ))}
    </Select>
  );
}
