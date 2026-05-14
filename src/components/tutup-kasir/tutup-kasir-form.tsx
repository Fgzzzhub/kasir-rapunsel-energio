"use client";

import { useState } from "react";
import { Loader2, Calculator, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Textarea } from "@/components/ui/textarea";
import { RupiahFormatter } from "@/components/ui/rupiah-formatter";
import { cn } from "@/lib/utils/cn";

export function TutupKasirForm({
  businessId,
  profileId,
  expectedCash,
}: {
  businessId: string;
  profileId: string;
  expectedCash: number;
}) {
  const router = useRouter();
  const [actualCash, setActualCash] = useState<number>(0);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const variance = actualCash - expectedCash;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch("/api/shift-recaps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId,
          profileId,
          expectedCash,
          actualCash,
          variance,
          notes,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Gagal menyimpan rekap shift");
      }

      setSuccess(true);
      router.refresh();
    } catch (err: any) {
      setSubmitError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (success) {
    return (
      <Card className="theme-card p-10 flex flex-col items-center text-center space-y-4">
        <div className="h-16 w-16 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <div>
          <h3 className="text-xl font-bold">Rekap Tersimpan</h3>
          <p className="text-muted-foreground mt-1">
            Data shift berhasil disimpan. Laci kasir sudah direkap.
          </p>
        </div>
        <Button onClick={() => setSuccess(false)} variant="outline" className="mt-4">
          Buat Rekap Baru
        </Button>
      </Card>
    );
  }

  return (
    <Card className="theme-card glow-ring p-6 sm:p-8">
      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="grid sm:grid-cols-2 gap-8">
          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              Perhitungan Sistem
            </h3>
            
            <div className="p-4 rounded-xl bg-[var(--surface-muted)] border border-[color:var(--border)]">
              <p className="text-sm font-medium text-muted-foreground mb-1">Uang Seharusnya di Laci (Cash Hari Ini)</p>
              <p className="text-3xl font-bold text-foreground">
                <RupiahFormatter value={expectedCash} />
              </p>
            </div>
            
            <div className="form-field pt-2">
              <label className="form-label">Uang Fisik Aktual (Di Laci)</label>
              <CurrencyInput
                className="h-14 text-2xl font-bold"
                value={actualCash}
                onValueChange={setActualCash}
                required
              />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Hasil Validasi
            </h3>

            <div className={cn(
              "p-4 rounded-xl border",
              variance === 0 ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" :
              variance > 0 ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" :
              "bg-rose-500/10 border-rose-500/20 text-rose-400"
            )}>
              <p className="text-sm font-medium mb-1 opacity-80">Selisih (Variance)</p>
              <p className="text-3xl font-bold">
                {variance > 0 ? "+" : ""}
                <RupiahFormatter value={variance} />
              </p>
              <p className="text-xs font-medium mt-1">
                {variance === 0 ? "Saldo sesuai" : variance > 0 ? "Uang fisik LEBIH" : "Uang fisik KURANG"}
              </p>
            </div>

            <div className="form-field pt-2">
              <label className="form-label">Catatan Tambahan (Opsional)</label>
              <Textarea 
                placeholder="Tulis alasan jika ada selisih..." 
                className="resize-none h-[72px]"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                required={variance !== 0}
              />
              {variance !== 0 && (
                <p className="text-xs text-[var(--danger)] mt-1">Catatan wajib diisi karena ada selisih.</p>
              )}
            </div>
          </div>
        </div>

        {submitError && (
          <div className="rounded-xl border border-[color:var(--danger)]/20 bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)]">
            {submitError}
          </div>
        )}

        <Button 
          type="submit" 
          disabled={isSubmitting || (variance !== 0 && !notes.trim())}
          className="w-full h-14 text-lg font-bold glow-accent"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Menyimpan Rekap...
            </>
          ) : (
            "Simpan Rekap Shift"
          )}
        </Button>
      </form>
    </Card>
  );
}
