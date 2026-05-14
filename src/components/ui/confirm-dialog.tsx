"use client";

import { Button } from "@/components/ui/button";

type ConfirmDialogProps = {
  cancelLabel?: string;
  children?: React.ReactNode;
  confirmLabel?: string;
  description: string;
  isSubmitting?: boolean;
  onClose: () => void;
  onConfirm: () => void;
  open: boolean;
  title: string;
  variant?: "default" | "danger";
};

export function ConfirmDialog({
  cancelLabel = "Batal",
  children,
  confirmLabel = "Lanjutkan",
  description,
  isSubmitting = false,
  onClose,
  onConfirm,
  open,
  title,
  variant = "default",
}: ConfirmDialogProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="theme-card-elevated w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-200">
        <h3
          className={
            variant === "danger"
              ? "text-2xl font-semibold text-[var(--danger)]"
              : "text-2xl font-semibold text-foreground"
          }
        >
          {title}
        </h3>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">{description}</p>
        {children}
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            {cancelLabel}
          </Button>
          <Button
            variant={variant === "danger" ? "danger" : "primary"}
            disabled={isSubmitting}
            onClick={() => {
              onConfirm();
              if (variant !== "danger") {
                onClose();
              }
            }}
          >
            {isSubmitting ? "Memproses..." : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
