"use client";

import { Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function CustomerEditForm({
  customer,
}: {
  customer: {
    id: string;
    name: string;
    notes: string | null;
    phone: string | null;
  };
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setError(null);
    setSuccess(null);
    setIsSaving(true);

    const response = await fetch(`/api/customers/${customer.id}`, {
      body: JSON.stringify({
        name: String(formData.get("name") ?? ""),
        notes: String(formData.get("notes") ?? ""),
        phone: String(formData.get("phone") ?? ""),
      }),
      headers: { "Content-Type": "application/json" },
      method: "PATCH",
    });
    const payload = (await response.json()) as { error?: string };

    setIsSaving(false);

    if (!response.ok) {
      setError(payload.error ?? "Customer gagal diperbarui.");
      return;
    }

    setSuccess("Customer berhasil diperbarui.");
    router.refresh();
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="form-field">
          <label className="form-label" htmlFor="customer-edit-name">
            Nama customer
          </label>
          <Input
            defaultValue={customer.name}
            id="customer-edit-name"
            name="name"
            placeholder="Nama customer"
            required
          />
        </div>
        <div className="form-field">
          <label className="form-label" htmlFor="customer-edit-phone">
            Nomor telepon
          </label>
          <Input
            defaultValue={customer.phone ?? ""}
            id="customer-edit-phone"
            name="phone"
            placeholder="Contoh: 08123456789"
          />
        </div>
      </div>
      <div className="form-field">
        <label className="form-label" htmlFor="customer-edit-notes">
          Catatan
        </label>
        <Textarea
          defaultValue={customer.notes ?? ""}
          id="customer-edit-notes"
          name="notes"
          placeholder="Preferensi pelanggan, alergi, atau catatan layanan."
        />
      </div>
      {error ? (
        <div className="rounded-2xl border border-[color:var(--danger)]/20 bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)]">
          {error}
        </div>
      ) : null}
      {success ? (
        <div className="rounded-2xl border border-emerald-500/20 bg-[var(--success-soft)] px-4 py-3 text-sm text-emerald-400">
          {success}
        </div>
      ) : null}
      <Button disabled={isSaving} type="submit" className="gap-2">
        <Save className="h-4 w-4" />
        {isSaving ? "Menyimpan..." : "Simpan perubahan"}
      </Button>
    </form>
  );
}
