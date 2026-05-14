"use client";

import { PencilLine, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import { AttendanceStatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { CurrencyInput } from "@/components/ui/currency-input";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { RupiahFormatter } from "@/components/ui/rupiah-formatter";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  ATTENDANCE_STATUS_OPTIONS,
  defaultAttendanceAmounts,
} from "@/lib/constants/attendance";
import type {
  AppBusiness,
  AppRole,
  AttendanceListItem,
  AttendanceMutationPayload,
  AttendanceStatus,
  EmployeeRow,
} from "@/lib/types/app";
import { cn } from "@/lib/utils/cn";
import { formatDateLong } from "@/lib/utils/date";

type AttendanceFormState = AttendanceMutationPayload;

function emptyForm(selectedBusinessId: string, employees: EmployeeRow[]): AttendanceFormState {
  return {
    attendanceDate: new Date().toISOString().slice(0, 10),
    businessId: selectedBusinessId,
    checkInTime: "",
    checkOutTime: "",
    deductionAmount: 0,
    employeeId: employees.find((employee) => employee.business_id === selectedBusinessId)?.id ?? "",
    mealAllowanceAmount: 0,
    mealAllowanceEligible: true,
    notes: "",
    status: "present",
  };
}

export function AttendanceManager({
  businesses,
  employees,
  records,
  role,
  selectedBusinessId,
}: {
  businesses: AppBusiness[];
  employees: EmployeeRow[];
  records: AttendanceListItem[];
  role: AppRole;
  selectedBusinessId: string;
}) {
  const employeesByBusiness = useMemo(() => {
    const map = new Map<string, EmployeeRow[]>();
    employees.forEach((employee) => {
      const current = map.get(employee.business_id) ?? [];
      current.push(employee);
      map.set(employee.business_id, current);
    });
    return map;
  }, [employees]);
  const employeeMap = useMemo(() => new Map(employees.map((employee) => [employee.id, employee])), [employees]);
  const businessMap = useMemo(() => new Map(businesses.map((business) => [business.id, business])), [businesses]);
  const [rows, setRows] = useState(records);
  const [editing, setEditing] = useState<AttendanceListItem | null>(null);
  const [pendingDelete, setPendingDelete] = useState<AttendanceListItem | null>(null);
  const [form, setForm] = useState<AttendanceFormState>(() => emptyForm(selectedBusinessId, employees));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function resetForm() {
    setEditing(null);
    setForm(emptyForm(selectedBusinessId, employees));
  }

  function setStatus(status: AttendanceStatus) {
    const defaults = defaultAttendanceAmounts(status);
    setForm((current) => ({
      ...current,
      ...defaults,
      status,
    }));
  }

  async function saveAttendance() {
    setIsSubmitting(true);
    setMessage(null);
    setError(null);

    const response = await fetch(editing ? `/api/attendance/${editing.id}` : "/api/attendance", {
      body: JSON.stringify(form),
      headers: { "Content-Type": "application/json" },
      method: editing ? "PATCH" : "POST",
    });
    const payload = (await response.json()) as { data?: AttendanceListItem; error?: string };

    setIsSubmitting(false);

    if (!response.ok || !payload.data) {
      setError(payload.error ?? "Absensi gagal disimpan.");
      return;
    }

    const savedRecord = payload.data as AttendanceListItem;

    const hydratedRecord: AttendanceListItem = {
      ...savedRecord,
      business: businessMap.get(savedRecord.business_id) ?? savedRecord.business ?? null,
      employee: employeeMap.get(savedRecord.employee_id) ?? savedRecord.employee ?? null,
    };

    setRows((current) =>
      editing
        ? current.map((row) => (row.id === editing.id ? hydratedRecord : row))
        : [hydratedRecord, ...current],
    );
    setMessage(editing ? "Absensi berhasil diperbarui." : "Absensi berhasil ditambahkan.");
    resetForm();
  }

  async function deleteAttendance(record: AttendanceListItem) {
    const response = await fetch(`/api/attendance/${record.id}`, { method: "DELETE" });
    const payload = (await response.json()) as { error?: string };

    if (!response.ok) {
      setError(payload.error ?? "Absensi gagal dihapus.");
      return;
    }

    setRows((current) => current.filter((row) => row.id !== record.id));
    setMessage("Absensi berhasil dihapus.");
  }

  function hydrate(record: AttendanceListItem) {
    setEditing(record);
    setForm({
      attendanceDate: record.attendance_date,
      businessId: record.business_id,
      checkInTime: record.check_in_time ?? "",
      checkOutTime: record.check_out_time ?? "",
      deductionAmount: Number(record.deduction_amount),
      employeeId: record.employee_id,
      mealAllowanceAmount: Number(record.meal_allowance_amount),
      mealAllowanceEligible: record.meal_allowance_eligible,
      notes: record.notes ?? "",
      status: record.status as AttendanceStatus,
    });
    setMessage(null);
    setError(null);
  }

  const activeEmployees = employeesByBusiness.get(form.businessId) ?? [];

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
      {/* Left: Attendance Data */}
      <div className="space-y-6">
        {rows.length ? (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block">
              <DataTable
                columns={[
                  {
                    key: "attendance_date",
                    label: "Tanggal",
                    render: (row) => (
                      <span className="font-medium">{formatDateLong(row.attendance_date)}</span>
                    ),
                  },
                  {
                    key: "employee",
                    label: "Karyawan",
                    render: (row) => (
                      <div className="flex flex-col">
                        <span className="font-semibold text-foreground">{row.employee?.name ?? "Karyawan"}</span>
                        <span className="text-xs text-muted-foreground">{row.business?.name ?? "-"}</span>
                      </div>
                    ),
                  },
                  {
                    key: "status",
                    label: "Status",
                    render: (row) => <AttendanceStatusBadge status={row.status} />,
                  },
                  {
                    key: "time",
                    label: "Jam",
                    render: (row) => (
                      <div className="text-sm">
                        <span className="text-foreground">{row.check_in_time ?? "--:--"}</span>
                        <span className="mx-1 text-muted-foreground">→</span>
                        <span className="text-foreground">{row.check_out_time ?? "--:--"}</span>
                      </div>
                    ),
                  },
                  {
                    align: "right",
                    key: "meal_allowance_amount",
                    label: "Uang Makan",
                    render: (row) => (
                      <div className="font-medium text-emerald-400">
                        <RupiahFormatter value={row.meal_allowance_amount} />
                      </div>
                    ),
                  },
                  {
                    align: "right",
                    key: "deduction_amount",
                    label: "Potongan",
                    render: (row) => (
                      <div className="font-medium text-rose-400">
                        <RupiahFormatter value={row.deduction_amount} />
                      </div>
                    ),
                  },
                  {
                    key: "actions",
                    label: "Aksi",
                    render: (row) => (
                      <div className="flex justify-end gap-1">
                        <Button
                          className="h-10 w-10 p-0"
                          variant="ghost"
                          onClick={() => hydrate(row)}
                        >
                          <PencilLine className="h-4 w-4 text-muted-foreground" />
                        </Button>
                        {role === "owner" ? (
                          <Button
                            className="h-10 w-10 p-0 hover:bg-rose-500/10 hover:text-rose-400"
                            variant="ghost"
                            onClick={() => setPendingDelete(row)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        ) : null}
                      </div>
                    ),
                  },
                ]}
                emptyMessage="Belum ada data absensi."
                rowKey={(row) => row.id}
                rows={rows}
              />
            </div>

            {/* Mobile Card View */}
            <div className="grid gap-4 md:hidden">
              {rows.map((row) => (
                <div
                  key={row.id}
                  className="theme-card group overflow-hidden border-l-4 p-4"
                  style={{
                    borderLeftColor:
                      row.status === "present"
                        ? "var(--success)"
                        : row.status === "late"
                          ? "var(--warning)"
                          : row.status === "absent"
                            ? "var(--danger)"
                            : "var(--accent)",
                  }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-foreground">{row.employee?.name ?? "Karyawan"}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{formatDateLong(row.attendance_date)}</p>
                      <p className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground/60">{row.business?.name}</p>
                    </div>
                    <AttendanceStatusBadge status={row.status} />
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-y-4 rounded-xl bg-surface-muted/50 p-3 ring-1 ring-border">
                    <div className="space-y-0.5">
                      <p className="text-[10px] font-medium uppercase text-muted-foreground">Check In/Out</p>
                      <p className="text-sm font-semibold">
                        {row.check_in_time ?? "--:--"} <span className="text-muted-foreground mx-1">•</span> {row.check_out_time ?? "--:--"}
                      </p>
                    </div>
                    <div className="space-y-0.5 text-right">
                      <p className="text-[10px] font-medium uppercase text-muted-foreground">Uang Makan</p>
                      <p className="text-sm font-bold text-emerald-400">
                        <RupiahFormatter value={row.meal_allowance_amount} />
                      </p>
                    </div>
                    <div className="col-span-2 space-y-0.5">
                      <p className="text-[10px] font-medium uppercase text-muted-foreground">Potongan</p>
                      <p className="text-sm font-bold text-rose-400">
                        <RupiahFormatter value={row.deduction_amount} />
                      </p>
                    </div>
                  </div>

                  {row.notes && (
                    <div className="mt-3 rounded-lg border border-border/50 bg-surface-elevated/30 p-2 text-xs italic text-muted-foreground">
                      &quot;{row.notes}&quot;
                    </div>
                  )}

                  <div className="mt-4 flex gap-2">
                    <Button
                      className="flex-1 h-11"
                      variant="secondary"
                      onClick={() => hydrate(row)}
                    >
                      <PencilLine className="mr-2 h-4 w-4" />
                      Edit
                    </Button>
                    {role === "owner" && (
                      <Button
                        className="h-11 w-11 p-0"
                        variant="danger"
                        onClick={() => setPendingDelete(row)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <EmptyState
            action={<Button className="glow-accent" onClick={resetForm}>Tambah absensi</Button>}
            description="Tambahkan absensi karyawan untuk mulai menghitung uang makan."
            title="Belum ada data absensi"
          />
        )}
      </div>

      {/* Right: Premium Form Card */}
      <div className="lg:sticky lg:top-6 lg:self-start">
        <Card className="glow-ring relative overflow-hidden">
          {/* Subtle background glow */}
          <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-accent/5 blur-3xl" />
          
          <CardHeader className="relative border-b border-border/50 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent ring-1 ring-accent/20">
                {editing ? <PencilLine className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
              </div>
              <div>
                <CardTitle className="text-xl">{editing ? "Edit Absensi" : "Input Absensi"}</CardTitle>
                <CardDescription>Atur kehadiran dan tunjangan karyawan.</CardDescription>
              </div>
            </div>
          </CardHeader>

          <form
            className="relative space-y-5 pt-6"
            onSubmit={(event) => {
              event.preventDefault();
              void saveAttendance();
            }}
          >
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="form-field">
                  <label className="form-label">Unit Bisnis</label>
                  <Select
                    disabled={role !== "owner"}
                    value={form.businessId}
                    onValueChange={(value) => {
                      const businessId = value;
                      setForm((current) => ({
                        ...current,
                        businessId,
                        employeeId: employeesByBusiness.get(businessId)?.[0]?.id ?? "",
                      }));
                    }}
                  >
                    <SelectTrigger className="h-11 w-full">
                      <SelectValue placeholder="Pilih bisnis..." />
                    </SelectTrigger>
                    <SelectContent className="z-50">
                      {businesses.map((business) => (
                        <SelectItem key={business.id} value={business.id}>{business.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="form-field">
                  <label className="form-label">Tanggal</label>
                  <Input
                    className="h-11"
                    required
                    type="date"
                    value={form.attendanceDate}
                    onChange={(event) => setForm((current) => ({ ...current, attendanceDate: event.target.value }))}
                  />
                </div>
              </div>

              <div className="form-field">
                <label className="form-label">Nama Karyawan</label>
                <Select
                  required
                  value={form.employeeId}
                  onValueChange={(value) => setForm((current) => ({ ...current, employeeId: value }))}
                >
                  <SelectTrigger className="h-11 w-full">
                    <SelectValue placeholder="Pilih karyawan..." />
                  </SelectTrigger>
                  <SelectContent className="z-50">
                    {activeEmployees.map((employee) => (
                      <SelectItem key={employee.id} value={employee.id}>{employee.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="form-field">
                <label className="form-label">Status Kehadiran</label>
                <div className="grid grid-cols-3 gap-2">
                  {ATTENDANCE_STATUS_OPTIONS.map((option) => {
                    const isActive = form.status === option.value;
                    return (
                      <button
                        key={option.value}
                        className={cn(
                          "flex h-10 flex-col items-center justify-center rounded-xl border text-[10px] font-bold uppercase transition-all",
                          isActive
                            ? "border-accent bg-accent-soft text-accent glow-accent"
                            : "border-border bg-surface-muted text-muted-foreground hover:border-accent/30 hover:bg-surface-hover"
                        )}
                        type="button"
                        onClick={() => setStatus(option.value)}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="form-field">
                  <label className="form-label">Jam Masuk</label>
                  <Input
                    className="h-11"
                    type="time"
                    value={form.checkInTime ?? ""}
                    onChange={(event) => setForm((current) => ({ ...current, checkInTime: event.target.value }))}
                  />
                </div>
                <div className="form-field">
                  <label className="form-label">Jam Pulang</label>
                  <Input
                    className="h-11"
                    type="time"
                    value={form.checkOutTime ?? ""}
                    onChange={(event) => setForm((current) => ({ ...current, checkOutTime: event.target.value }))}
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-border/50 bg-surface-muted/30 p-4">
                <label className="flex cursor-pointer items-center gap-3">
                  <input
                    checked={form.mealAllowanceEligible}
                    className="h-5 w-5 rounded-lg border-border bg-surface-elevated text-accent transition-all focus:ring-accent/30"
                    type="checkbox"
                    onChange={(event) => setForm((current) => ({ ...current, mealAllowanceEligible: event.target.checked }))}
                  />
                  <div className="space-y-0.5">
                    <span className="text-sm font-bold text-foreground">Klaim Uang Makan</span>
                    <p className="text-[10px] text-muted-foreground">Karyawan berhak menerima uang makan hari ini.</p>
                  </div>
                </label>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div className="form-field">
                    <label className="form-label text-[10px]">Nilai Uang Makan</label>
                    <CurrencyInput
                      className="h-10 text-sm font-semibold text-emerald-400"
                      value={form.mealAllowanceAmount}
                      onValueChange={(value) => setForm((current) => ({ ...current, mealAllowanceAmount: value }))}
                    />
                  </div>
                  <div className="form-field">
                    <label className="form-label text-[10px]">Nilai Potongan</label>
                    <CurrencyInput
                      className="h-10 text-sm font-semibold text-rose-400"
                      value={form.deductionAmount}
                      onValueChange={(value) => setForm((current) => ({ ...current, deductionAmount: value }))}
                    />
                  </div>
                </div>
              </div>

              <div className="form-field">
                <label className="form-label text-[10px] uppercase">Catatan Tambahan</label>
                <Textarea
                  className="min-h-[80px] rounded-xl"
                  placeholder="Contoh: Terlambat karena hujan, Izin sakit dengan surat dokter..."
                  value={form.notes ?? ""}
                  onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                />
              </div>
            </div>

            {error ? (
              <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-xs text-rose-400">
                {error}
              </div>
            ) : null}
            
            {message ? (
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-400">
                {message}
              </div>
            ) : null}

            <div className="flex flex-col gap-3 pt-2">
              <Button
                className="h-12 w-full text-base font-bold glow-accent"
                disabled={isSubmitting || !form.employeeId || !form.attendanceDate}
                type="submit"
              >
                {isSubmitting ? "Memproses..." : editing ? "Simpan Perubahan" : "Konfirmasi Absensi"}
              </Button>
              <Button
                className="h-11 w-full border-border/50 text-muted-foreground hover:bg-surface-hover"
                variant="secondary"
                onClick={resetForm}
              >
                Batalkan / Reset
              </Button>
            </div>
          </form>
        </Card>
      </div>

      <ConfirmDialog
        confirmLabel="Ya, Hapus"
        description="Data absensi ini akan dihapus permanen dan tidak akan masuk dalam rekapitulasi gaji."
        open={Boolean(pendingDelete)}
        title="Hapus Data Absensi?"
        onClose={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) void deleteAttendance(pendingDelete);
        }}
      />
    </div>
  );
}
