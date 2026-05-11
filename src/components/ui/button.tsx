import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils/cn";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "outline";
  size?: "sm" | "md" | "lg" | "icon";
};

export function Button({
  className,
  type = "button",
  variant = "primary",
  size = "md",
  ...props
}: ButtonProps) {
  const variantClassName =
    variant === "secondary"
      ? "border border-[color:var(--border-strong)] bg-[var(--surface-hover)] text-foreground hover:bg-[var(--surface-elevated)]"
      : variant === "ghost"
        ? "bg-transparent text-foreground-secondary hover:bg-[var(--surface-hover)] hover:text-foreground"
        : variant === "danger"
          ? "bg-[var(--danger)] text-white hover:opacity-90"
          : variant === "outline"
            ? "border border-[color:var(--accent)] bg-transparent text-[var(--accent)] hover:bg-[var(--accent-soft)]"
            : "theme-accent hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-[var(--accent-glow)]";

  const sizeClassName =
    size === "sm"
      ? "min-h-9 px-3 py-1.5 text-xs rounded-lg"
      : size === "icon"
        ? "h-10 w-10 rounded-xl p-0"
      : size === "lg"
        ? "min-h-13 px-6 py-3 text-base rounded-2xl"
        : "min-h-11 px-4 py-2 text-sm rounded-xl";

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap font-semibold disabled:cursor-not-allowed disabled:opacity-40",
        sizeClassName,
        variantClassName,
        className,
      )}
      type={type}
      {...props}
    />
  );
}
