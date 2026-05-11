"use client";

import { useMemo, useState } from "react";
import { PencilLine, Plus, Power } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { CurrencyInput } from "@/components/ui/currency-input";
import { DataTable } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { RupiahFormatter } from "@/components/ui/rupiah-formatter";
import { Textarea } from "@/components/ui/textarea";
import type { ServiceRow } from "@/lib/types/app";

type ServiceManagerProps = {
  businessId: string;
  canManage: boolean;
  initialServices: ServiceRow[];
};

type ServiceFormState = {
  description: string;
  durationMinutes: string;
  isActive: boolean;
  name: string;
  price: number;
};

const emptyFormState: ServiceFormState = {
  description: "",
  durationMinutes: "",
  isActive: true,
  name: "",
  price: 0,
};

function sortServices(services: ServiceRow[]) {
  return [...services].sort((left, right) => {
    if (left.is_active !== right.is_active) {
      return left.is_active ? -1 : 1;
    }

    return left.name.localeCompare(right.name, "id-ID");
  });
}

export function ServiceManager({
  businessId,
  canManage,
  initialServices,
}: ServiceManagerProps) {
  const [services, setServices] = useState(sortServices(initialServices));
  const [search, setSearch] = useState("");
  const [editingService, setEditingService] = useState<ServiceRow | null>(null);
  const [form, setForm] = useState<ServiceFormState>(emptyFormState);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingToggle, setPendingToggle] = useState<ServiceRow | null>(null);

  const filteredServices = useMemo(() => {
    if (!search.trim()) {
      return services;
    }

    const query = search.trim().toLowerCase();

    return services.filter((service) =>
      [service.name, service.description ?? ""].some((value) =>
        value.toLowerCase().includes(query),
      ),
    );
  }, [search, services]);

  function resetForm() {
    setEditingService(null);
    setForm(emptyFormState);
  }

  function hydrateForm(service: ServiceRow) {
    setEditingService(service);
    setForm({
      description: service.description ?? "",
      durationMinutes: service.duration_minutes ? String(service.duration_minutes) : "",
      isActive: service.is_active,
      name: service.name,
      price: Number(service.price),
    });
    setStatusMessage(null);
    setErrorMessage(null);
  }

  async function upsertService(nextForm: ServiceFormState, serviceId?: string) {
    setIsSubmitting(true);
    setStatusMessage(null);
    setErrorMessage(null);

    const response = await fetch(serviceId ? `/api/services/${serviceId}` : "/api/services", {
      body: JSON.stringify({
        businessId,
        description: nextForm.description,
        durationMinutes: nextForm.durationMinutes ? Number(nextForm.durationMinutes) : null,
        isActive: nextForm.isActive,
        name: nextForm.name,
        price: nextForm.price,
      }),
      headers: {
        "Content-Type": "application/json",
      },
      method: serviceId ? "PATCH" : "POST",
    });

    const payload = (await response.json()) as {
      data?: ServiceRow;
      error?: string;
    };

    setIsSubmitting(false);

    if (!response.ok || !payload.data) {
      setErrorMessage(payload.error ?? "Gagal menyimpan layanan.");
      return;
    }

    setServices((current) =>
      sortServices(
        current.some((service) => service.id === payload.data!.id)
          ? current.map((service) => (service.id === payload.data!.id ? payload.data! : service))
          : [payload.data!, ...current],
      ),
    );

    setStatusMessage(serviceId ? "Layanan berhasil diperbarui." : "Layanan berhasil ditambahkan.");
    resetForm();
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
      <Card>
        <CardHeader className="px-0">
          <CardTitle>Daftar layanan</CardTitle>
          <CardDescription>
            Kelola harga, durasi, dan status aktif layanan untuk bisnis yang sedang dipilih.
          </CardDescription>
        </CardHeader>
        <div className="mb-4">
          <Input
            placeholder="Cari layanan..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <DataTable
          columns={[
            {
              key: "name",
              label: "Layanan",
              render: (service) => (
                <div className="space-y-1">
                  <p className="font-semibold">{service.name}</p>
                  <p className="text-xs leading-5 text-muted-foreground">
                    {service.description || "Tanpa deskripsi"}
                  </p>
                </div>
              ),
            },
            {
              key: "price",
              label: "Harga",
              render: (service) => <RupiahFormatter value={service.price} />,
            },
            {
              key: "duration_minutes",
              label: "Durasi",
              render: (service) =>
                service.duration_minutes ? `${service.duration_minutes} menit` : "-",
            },
            {
              key: "is_active",
              label: "Status",
              render: (service) => (
                <span className={service.is_active ? "theme-pill" : "theme-pill opacity-60"}>
                  {service.is_active ? "Aktif" : "Nonaktif"}
                </span>
              ),
            },
            {
              key: "actions",
              label: "Aksi",
              render: (service) =>
                canManage ? (
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button
                      className="px-3"
                      variant="ghost"
                      onClick={() => hydrateForm(service)}
                    >
                      <PencilLine className="h-4 w-4" />
                    </Button>
                    <Button
                      className="px-3"
                      variant="secondary"
                      onClick={() => setPendingToggle(service)}
                    >
                      <Power className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">Lihat saja</span>
                ),
            },
          ]}
          emptyMessage="Belum ada layanan untuk bisnis ini."
          rowKey={(service) => service.id}
          rows={filteredServices}
        />
      </Card>

      <Card>
        <CardHeader className="px-0">
          <CardTitle>{editingService ? "Ubah layanan" : "Tambah layanan"}</CardTitle>
          <CardDescription>
            Semua harga disimpan dinamis dan dipakai sebagai snapshot saat transaksi dibuat.
          </CardDescription>
        </CardHeader>

        {canManage ? (
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              void upsertService(form, editingService?.id);
            }}
          >
            <div className="form-field">
              <label className="form-label" htmlFor="serviceName">
                Nama layanan
              </label>
              <Input
                id="serviceName"
                required
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({ ...current, name: event.target.value }))
                }
              />
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="serviceDescription">
                Deskripsi
              </label>
              <Textarea
                id="serviceDescription"
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({ ...current, description: event.target.value }))
                }
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="form-field">
                <label className="form-label" htmlFor="servicePrice">
                  Harga
                </label>
                <CurrencyInput
                  id="servicePrice"
                  required
                  value={form.price}
                  onValueChange={(value) =>
                    setForm((current) => ({ ...current, price: value }))
                  }
                />
              </div>
              <div className="form-field">
                <label className="form-label" htmlFor="serviceDuration">
                  Durasi (menit)
                </label>
                <Input
                  id="serviceDuration"
                  inputMode="numeric"
                  value={form.durationMinutes}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      durationMinutes: event.target.value.replace(/[^\d]/g, ""),
                    }))
                  }
                />
              </div>
            </div>
            <label className="flex items-center gap-3 rounded-2xl border border-[color:var(--border)] bg-[var(--surface-muted)] px-4 py-3 text-sm font-medium">
              <input
                checked={form.isActive}
                className="h-4 w-4"
                type="checkbox"
                onChange={(event) =>
                  setForm((current) => ({ ...current, isActive: event.target.checked }))
                }
              />
              Aktifkan layanan ini
            </label>
            {errorMessage ? (
              <div className="rounded-2xl border border-[color:var(--danger)]/20 bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)]">
                {errorMessage}
              </div>
            ) : null}
            {statusMessage ? (
              <div className="rounded-2xl border border-emerald-500/20 bg-[var(--success-soft)] px-4 py-3 text-sm text-emerald-400">
                {statusMessage}
              </div>
            ) : null}
            <div className="flex flex-wrap gap-3">
              <Button disabled={isSubmitting || form.price <= 0} type="submit">
                {editingService ? "Simpan perubahan" : "Tambah layanan"}
              </Button>
              {editingService ? (
                <Button variant="secondary" onClick={resetForm}>
                  Batal edit
                </Button>
              ) : (
                <Button variant="secondary" onClick={resetForm}>
                  <Plus className="mr-2 h-4 w-4" />
                  Reset
                </Button>
              )}
            </div>
          </form>
        ) : (
          <div className="rounded-2xl border border-[color:var(--border)] bg-[var(--surface-muted)] px-4 py-5 text-sm leading-6 text-muted-foreground">
            Admin hanya dapat melihat daftar layanan pada fase ini. Perubahan harga dan status
            layanan dibatasi untuk role owner.
          </div>
        )}
      </Card>

      <ConfirmDialog
        confirmLabel={pendingToggle?.is_active ? "Nonaktifkan" : "Aktifkan"}
        description={
          pendingToggle?.is_active
            ? "Layanan nonaktif tidak muncul di form transaksi baru."
            : "Layanan akan kembali tersedia di transaksi baru."
        }
        open={Boolean(pendingToggle)}
        title={`${pendingToggle?.is_active ? "Nonaktifkan" : "Aktifkan"} layanan`}
        onClose={() => setPendingToggle(null)}
        onConfirm={() => {
          if (!pendingToggle) {
            return;
          }

          void upsertService(
            {
              description: pendingToggle.description ?? "",
              durationMinutes: pendingToggle.duration_minutes
                ? String(pendingToggle.duration_minutes)
                : "",
              isActive: !pendingToggle.is_active,
              name: pendingToggle.name,
              price: Number(pendingToggle.price),
            },
            pendingToggle.id,
          );
        }}
      />
    </div>
  );
}
