import { formatRupiah } from "@/lib/utils/currency";

export function RupiahFormatter({
  className,
  value,
}: {
  className?: string;
  value: number | string | null | undefined;
}) {
  return <span className={className}>{formatRupiah(value)}</span>;
}
