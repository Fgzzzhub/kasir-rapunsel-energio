const rupiahFormatter = new Intl.NumberFormat("id-ID", {
  currency: "IDR",
  maximumFractionDigits: 0,
  style: "currency",
});

export function toNumber(value: number | string | null | undefined) {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    return Number(value);
  }

  return 0;
}

export function formatRupiah(value: number | string | null | undefined) {
  return rupiahFormatter.format(toNumber(value)).replace(/\s/g, "");
}

export function parseCurrencyInput(value: string) {
  const normalized = value.replace(/[^\d-]/g, "");

  if (!normalized) {
    return 0;
  }

  return Number(normalized);
}
