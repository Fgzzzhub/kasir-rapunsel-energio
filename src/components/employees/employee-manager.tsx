"use client";

import { useMemo, useState } from "react";
import { MoreVertical, PencilLine, Plus, Power, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { CurrencyInput } from "@/components/ui/currency-input";
import { DataTable } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { RupiahFormatter } from "@/components/ui/rupiah-formatter";
import { Tooltip } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuPortal, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import type { EmployeeRow } from "@/lib/types/app";

type EmployeeManagerProps = {
  businessId: string;
  initialEmployees: EmployeeRow[];
};

type EmployeeFormState = {
  baseSalary: number;
  commissionRate: string;
  isActive: boolean;
  name: string;
  phone: string;
  position: string;
};

const emptyFormState: EmployeeFormState = {
  baseSalary: 0,
  commissionRate: "10",
  isActive: true,
  name: "",
  phone: "",
  position: "",
};

function sortEmployees(employees: EmployeeRow[]) {
  return [...employees].sort((left, right) => {
    if (left.is_active !== right.is_active) {
      return left.is_active ? -1 : 1;
    }

    return left.name.localeCompare(right.name, "id-ID");
  });
}

export function EmployeeManager({
  businessId,
  initialEmployees,
}: EmployeeManagerProps) {
  const [employees, setEmployees] = useState(sortEmployees(initialEmployees));
  const [search, setSearch] = useState("");
  const [editingEmployee, setEditingEmployee] = useState<EmployeeRow | null>(null);
  const [form, setForm] = useState<EmployeeFormState>(emptyFormState);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingToggle, setPendingToggle] = useState<EmployeeRow | null>(null);
  const [pendingDelete, setPendingDelete] = useState<EmployeeRow | null>(null);

  const filteredEmployees = useMemo(() => {
    if (!search.trim()) {
      return employees;
    }

    const query = search.trim().toLowerCase();

    return employees.filter((employee) =>
      [employee.name, employee.position ?? "", employee.phone ?? ""].some((value) =>
        value.toLowerCase().includes(query),
      ),
    );
  }, [employees, search]);

  function resetForm() {
    setEditingEmployee(null);
    setForm(emptyFormState);
  }

  function hydrateForm(employee: EmployeeRow) {
    setEditingEmployee(employee);
    setForm({
      baseSalary: Number(employee.base_salary),
      commissionRate: String(employee.commission_rate),
      isActive: employee.is_active,
      name: employee.name,
      phone: employee.phone ?? "",
      position: employee.position ?? "",
    });
    setStatusMessage(null);
    setErrorMessage(null);
  }

  async function upsertEmployee(nextForm: EmployeeFormState, employeeId?: string) {
    setIsSubmitting(true);
    setStatusMessage(null);
    setErrorMessage(null);

    const response = await fetch(
      employeeId ? `/api/employees/${employeeId}` : "/api/employees",
      {
        body: JSON.stringify({
          baseSalary: nextForm.baseSalary,
          businessId,
          commissionRate: Number(nextForm.commissionRate),
          isActive: nextForm.isActive,
          name: nextForm.name,
          phone: nextForm.phone,
          position: nextForm.position,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: employeeId ? "PATCH" : "POST",
      },
    );

    const payload = (await response.json()) as {
      data?: EmployeeRow;
      error?: string;
    };

    setIsSubmitting(false);

    if (!response.ok || !payload.data) {
      setErrorMessage(payload.error ?? "Gagal menyimpan karyawan.");
      return;
    }

    setEmployees((current) =>
      sortEmployees(
        current.some((employee) => employee.id === payload.data!.id)
          ? current.map((employee) =>
              employee.id === payload.data!.id ? payload.data! : employee,
            )
          : [payload.data!, ...current],
      ),
    );

    setStatusMessage(
      employeeId ? "Data karyawan berhasil diperbarui." : "Karyawan berhasil ditambahkan.",
    );
    resetForm();
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
      <Card>
        <CardHeader className="px-0">
          <CardTitle>Daftar karyawan</CardTitle>
          <CardDescription>
            Gaji pokok dan komisi karyawan akan menjadi dasar perhitungan payroll di fase
            berikutnya.
          </CardDescription>
        </CardHeader>
        <div className="mb-4">
          <Input
            placeholder="Cari karyawan..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <DataTable
          columns={[
            {
              key: "name",
              label: "Karyawan",
              render: (employee) => (
                <div className="space-y-1">
                  <p className="font-semibold">{employee.name}</p>
                  <p className="text-xs leading-5 text-muted-foreground">
                    {employee.position || "Posisi belum diatur"}
                  </p>
                </div>
              ),
            },
            {
              key: "base_salary",
              label: "Gaji pokok",
              render: (employee) => <RupiahFormatter value={employee.base_salary} />,
            },
            {
              key: "commission_rate",
              label: "Komisi",
              render: (employee) => `${employee.commission_rate}%`,
            },
            {
              key: "phone",
              label: "Kontak",
              render: (employee) => employee.phone || "-",
            },
            {
              key: "is_active",
              label: "Status",
              render: (employee) => (
                <span className={employee.is_active ? "theme-pill" : "theme-pill opacity-60"}>
                  {employee.is_active ? "Aktif" : "Nonaktif"}
                </span>
              ),
            },
            {
              key: "actions",
              label: "Aksi",
              render: (employee) => (
                <div className="flex items-center justify-end gap-1">
                  <Tooltip content="Edit">
                    <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => hydrateForm(employee)}>
                      <PencilLine className="h-4 w-4" />
                    </Button>
                  </Tooltip>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-[var(--surface-hover)] hover:text-foreground">
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuPortal>
                      <DropdownMenuContent align="end" className="z-50">
                        <DropdownMenuItem
                          onClick={() => setPendingToggle(employee)}
                        >
                          <Power className="h-4 w-4" />
                          {employee.is_active ? "Nonaktifkan" : "Aktifkan"}
                        </DropdownMenuItem>
                        {employee.is_active ? (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              destructive
                              onClick={() => setPendingDelete(employee)}
                            >
                              <Trash2 className="h-4 w-4" />
                              Hapus
                            </DropdownMenuItem>
                          </>
                        ) : null}
                      </DropdownMenuContent>
                    </DropdownMenuPortal>
                  </DropdownMenu>
                </div>
              ),
            },
          ]}
          emptyMessage="Belum ada karyawan untuk bisnis ini."
          rowKey={(employee) => employee.id}
          rows={filteredEmployees}
        />
      </Card>

      <Card>
        <CardHeader className="px-0">
          <CardTitle>{editingEmployee ? "Ubah karyawan" : "Tambah karyawan"}</CardTitle>
          <CardDescription>
            Komisi dan gaji pokok bersifat dinamis. Riwayat transaksi tetap aman karena
            menyimpan snapshot saat transaksi dibuat.
          </CardDescription>
        </CardHeader>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            void upsertEmployee(form, editingEmployee?.id);
          }}
        >
          <div className="form-field">
            <label className="form-label" htmlFor="employeeName">
              Nama karyawan
            </label>
            <Input
              id="employeeName"
              required
              value={form.name}
              onChange={(event) =>
                setForm((current) => ({ ...current, name: event.target.value }))
              }
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="form-field">
              <label className="form-label" htmlFor="employeePosition">
                Posisi
              </label>
              <Input
                id="employeePosition"
                value={form.position}
                onChange={(event) =>
                  setForm((current) => ({ ...current, position: event.target.value }))
                }
              />
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="employeePhone">
                Telepon
              </label>
              <Input
                id="employeePhone"
                value={form.phone}
                onChange={(event) =>
                  setForm((current) => ({ ...current, phone: event.target.value }))
                }
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="form-field">
              <label className="form-label" htmlFor="employeeSalary">
                Gaji pokok
              </label>
              <CurrencyInput
                id="employeeSalary"
                required
                value={form.baseSalary}
                onValueChange={(value) =>
                  setForm((current) => ({ ...current, baseSalary: value }))
                }
              />
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="employeeCommission">
                Komisi (%)
              </label>
              <Input
                id="employeeCommission"
                inputMode="decimal"
                required
                value={form.commissionRate}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    commissionRate: event.target.value.replace(/[^\d.]/g, ""),
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
            Aktifkan karyawan ini
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
            <Button disabled={isSubmitting} type="submit">
              {editingEmployee ? "Simpan perubahan" : "Tambah karyawan"}
            </Button>
            {editingEmployee ? (
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
      </Card>

      <ConfirmDialog
        confirmLabel={pendingToggle?.is_active ? "Nonaktifkan" : "Aktifkan"}
        description={
          pendingToggle?.is_active
            ? "Karyawan nonaktif tidak akan tersedia di form transaksi baru."
            : "Karyawan akan kembali tersedia pada transaksi baru."
        }
        open={Boolean(pendingToggle)}
        title={`${pendingToggle?.is_active ? "Nonaktifkan" : "Aktifkan"} karyawan`}
        onClose={() => setPendingToggle(null)}
        onConfirm={() => {
          if (!pendingToggle) {
            return;
          }

          void upsertEmployee(
            {
              baseSalary: Number(pendingToggle.base_salary),
              commissionRate: String(pendingToggle.commission_rate),
              isActive: !pendingToggle.is_active,
              name: pendingToggle.name,
              phone: pendingToggle.phone ?? "",
              position: pendingToggle.position ?? "",
            },
            pendingToggle.id,
          );
        }}
      />

      <ConfirmDialog
        confirmLabel="Hapus Karyawan"
        description={`Anda akan menghapus karyawan "${pendingDelete?.name ?? ""}". Data komisi dan riwayat transaksi tetap aman, tetapi karyawan tidak akan bisa dipilih di transaksi baru.`}
        open={Boolean(pendingDelete)}
        title="Hapus karyawan?"
        variant="danger"
        onClose={() => setPendingDelete(null)}
        onConfirm={() => {
          if (!pendingDelete) {
            return;
          }

          void upsertEmployee(
            {
              baseSalary: Number(pendingDelete.base_salary),
              commissionRate: String(pendingDelete.commission_rate),
              isActive: false,
              name: pendingDelete.name,
              phone: pendingDelete.phone ?? "",
              position: pendingDelete.position ?? "",
            },
            pendingDelete.id,
          );
          setPendingDelete(null);
        }}
      />
    </div>
  );
}
