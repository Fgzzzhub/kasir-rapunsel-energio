"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

export function GoogleSheetsSyncPanel({
  configured,
  message,
}: {
  configured: boolean;
  message: string;
}) {
  const [statusMessage, setStatusMessage] = useState(message);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function runSync(includeFailed = false) {
    setIsSubmitting(true);

    const response = await fetch("/api/sync/google-sheets", {
      body: JSON.stringify({
        includeFailed,
        limit: 25,
      }),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });
    const payload = (await response.json()) as {
      configured?: boolean;
      error?: string;
      failed?: number;
      message?: string;
      processed?: number;
      synced?: number;
    };

    setIsSubmitting(false);

    if (!response.ok) {
      setStatusMessage(
        payload.error ?? payload.message ?? "Sinkronisasi Google Sheets gagal dijalankan.",
      );
      return;
    }

    setStatusMessage(
      payload.configured
        ? `Sinkronisasi selesai. Diproses ${payload.processed ?? 0}, berhasil ${payload.synced ?? 0}, gagal ${payload.failed ?? 0}.`
        : payload.message ?? "Kredensial sync belum lengkap.",
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-[color:var(--border)] bg-[var(--surface-muted)] px-4 py-5 text-sm leading-6 text-muted-foreground">
        {statusMessage}
      </div>
      <div className="flex flex-wrap gap-3">
        <Button disabled={isSubmitting || !configured} onClick={() => void runSync(false)}>
          Sync pending logs
        </Button>
        <Button
          disabled={isSubmitting || !configured}
          variant="secondary"
          onClick={() => void runSync(true)}
        >
          Retry failed logs
        </Button>
      </div>
    </div>
  );
}
