import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils/cn";
import type { AttendanceStatus, PaymentMethod } from "@/lib/types/app";

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: "accent" | "neutral" | "success" | "danger" | "rose" | "mint" | "warning" | "purple";
};

export function Badge({
  className,
  tone = "accent",
  ...props
}: BadgeProps) {
  const toneClassName =
    tone === "neutral"
      ? "bg-white/8 text-foreground-secondary border border-[color:var(--border)]"
      : tone === "success"
        ? "bg-[var(--success-soft)]0/12 text-emerald-400 border border-emerald-500/20"
        : tone === "danger"
          ? "bg-red-500/12 text-red-400 border border-red-500/20"
          : tone === "rose"
            ? "bg-[var(--danger-soft)]0/12 text-rose-400 border border-rose-500/20"
            : tone === "mint"
              ? "bg-teal-500/12 text-teal-400 border border-teal-500/20"
              : tone === "warning"
                ? "bg-[var(--warning-soft)]0/12 text-amber-400 border border-amber-500/20"
                : tone === "purple"
                  ? "bg-purple-500/12 text-purple-400 border border-purple-500/20"
                  : "theme-accent-soft border border-[color:rgba(232,118,154,0.15)]";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
        toneClassName,
        className,
      )}
      {...props}
    />
  );
}

export function BusinessBadge({
  name,
  slug,
}: {
  name?: string | null;
  slug?: string | null;
}) {
  const isEnergio = slug === "energio-reflexologi";

  return <Badge tone={isEnergio ? "mint" : "rose"}>{name ?? "Bisnis"}</Badge>;
}

export function PaymentMethodBadge({ method }: { method: PaymentMethod | string }) {
  const label =
    method === "cash"
      ? "Cash"
      : method === "qris"
        ? "QRIS"
        : method === "transfer"
          ? "Transfer"
          : "Lainnya";

  return <Badge tone={method === "cash" ? "success" : method === "qris" ? "accent" : "neutral"}>{label}</Badge>;
}

export function RoleBadge({ role }: { role: "owner" | "admin" }) {
  return <Badge tone={role === "owner" ? "accent" : "neutral"}>{role === "owner" ? "Owner" : "Admin"}</Badge>;
}

export function CustomerTypeBadge({ visits }: { visits: number }) {
  return <Badge tone={visits > 1 ? "success" : "neutral"}>{visits > 1 ? "Repeat" : "Baru"}</Badge>;
}

export function attendanceStatusLabel(status: AttendanceStatus | string) {
  if (status === "present") return "Hadir";
  if (status === "absent") return "Tidak Hadir";
  if (status === "late") return "Terlambat";
  if (status === "half_day") return "Setengah Hari";
  if (status === "sick") return "Sakit";
  if (status === "leave") return "Izin/Cuti";
  return "Tidak diketahui";
}

export function AttendanceStatusBadge({ status }: { status: AttendanceStatus | string }) {
  const tone =
    status === "present"
      ? "success"
      : status === "absent"
        ? "danger"
        : status === "late"
          ? "warning"
          : status === "half_day"
            ? "accent"
            : status === "sick"
              ? "rose"
              : status === "leave"
                ? "purple"
                : "neutral";

  return <Badge tone={tone}>{attendanceStatusLabel(status)}</Badge>;
}
