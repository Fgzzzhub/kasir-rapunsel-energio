"use client";

import type { InputHTMLAttributes } from "react";

import { Input } from "@/components/ui/input";
import { formatRupiah, parseCurrencyInput } from "@/lib/utils/currency";

type CurrencyInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "onChange" | "value"
> & {
  onValueChange: (value: number) => void;
  value: number | null | undefined;
};

export function CurrencyInput({
  onValueChange,
  value,
  ...props
}: CurrencyInputProps) {
  return (
    <Input
      {...props}
      inputMode="numeric"
      value={value ? formatRupiah(value) : ""}
      onChange={(event) => {
        const parsedValue = parseCurrencyInput(event.target.value);
        onValueChange(parsedValue);
      }}
    />
  );
}
