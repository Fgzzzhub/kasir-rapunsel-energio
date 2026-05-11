"use client";

import { useMemo, useState } from "react";
import { PencilLine, Plus, Trash2 } from "lucide-react";
import Link from "next/link";

import { ReportExportButtons } from "@/components/reports/report-export-buttons";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { CurrencyInput } from "@/components/ui/currency-input";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { RupiahFormatter } from "@/components/ui/rupiah-formatter";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { SALARY_ADJUSTMENT_TYPE_OPTIONS } from "@/lib/constants/app";
import type {
  AppBusiness,
  EmployeeRow,
  PayrollEmployeeSummary,
  PayrollReportData,
  SalaryAdjustmentListItem,
  SalaryAdjustmentRow,
} from "@/lib/types/app";
import { formatDateLong, formatDateTime } from "@/lib/utils/date";
import { toNumber } from "@/lib/utils/currency";
import { formatCommissionRate } from "@/lib/utils/transaction-services";

type Filters = {
  endDate: string;
  scope: "selected" | "combined";
  startDate: string;
};

type AdjustmentFormState = {
  adjustmentDate: string;
  amount: number;
  businessId: string;
  employeeId: string;
  notes: string;
  type: "bonus" | "deduction";
};

function sortAdjustments(adjustments: SalaryAdjustmentListItem[]) {
  return [...adjustments].sort((left, right) => {
    const dateCompare = right.adjustment_date.localeCompare(left.adjustment_date);

    if (dateCompare !== 0) {
      return dateCompare;
    }

    return right.created_at.localeCompare(left.created_at);
  });
}

export function PayrollManager({
  businesses,
  employees,
  filters,
  payroll,
  selectedBusinessId,
  selectedBusinessName,
}: {
  businesses: AppBusiness[];
  employees: EmployeeRow[];
  filters: Filters;
  payroll: PayrollReportData;
  selectedBusinessId: string;
  selectedBusinessName: string;
}) {
  const employeesByBusiness = useMemo(() => {
    const entries = new Map<string, EmployeeRow[]>();

    employees.forEach((employee) => {
      const current = entries.get(employee.business_id) ?? [];
      current.push(employee);
      entries.set(employee.business_id, current);
    });

    return entries;
  }, [employees]);
  const employeeNameMap = useMemo(
    () => new Map(employees.map((employee) => [employee.id, employee.name])),
    [employees],
  );
  const businessNameMap = useMemo(
    () => new Map(businesses.map((business) => [business.id, business.name])),
    [businesses],
  );

  const [adjustments, setAdjustments] = useState(sortAdjustments(payroll.adjustments));
  const [editingAdjustment, setEditingAdjustment] = useState<SalaryAdjustmentListItem | null>(null);
  const [pendingDelete, setPendingDelete] = useState<SalaryAdjustmentListItem | null>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(
    payroll.employees[0]?.employeeId ?? null,
  );
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState<AdjustmentFormState>({
    adjustmentDate: filters.endDate,
    amount: 0,
    businessId: selectedBusinessId,
    employeeId: employeesByBusiness.get(selectedBusinessId)?.[0]?.id ?? "",
    notes: "",
    type: "bonus",
  });

  const computedEmployees = useMemo(() => {
    return payroll.employees
      .map((employee) => {
        const employeeAdjustments = adjustments.filter(
          (adjustment) => adjustment.employee_id === employee.employeeId,
        );
        const totalBonus = employeeAdjustments
          .filter((adjustment) => adjustment.type === "bonus")
          .reduce((sum, adjustment) => sum + toNumber(adjustment.amount), 0);
        const totalDeduction = employeeAdjustments
          .filter((adjustment) => adjustment.type === "deduction")
          .reduce((sum, adjustment) => sum + toNumber(adjustment.amount), 0);

        return {
          ...employee,
          adjustments: employeeAdjustments,
          netSalary:
            employee.baseSalary +
            employee.totalCommission +
            totalBonus -
            totalDeduction +
            employee.totalMealAllowance -
            employee.totalAttendanceDeduction,
          totalBonus,
          totalDeduction,
        } satisfies PayrollEmployeeSummary;
      })
      .sort((left, right) => left.employeeName.localeCompare(right.employeeName, "id-ID"));
  }, [adjustments, payroll.employees]);

  const summary = useMemo(
    () =>
      computedEmployees.reduce(
        (accumulator, employee) => ({
          totalBaseSalary: accumulator.totalBaseSalary + employee.baseSalary,
          totalBonus: accumulator.totalBonus + employee.totalBonus,
          totalCommission: accumulator.totalCommission + employee.totalCommission,
          totalDeduction: accumulator.totalDeduction + employee.totalDeduction,
          totalMealAllowance: accumulator.totalMealAllowance + employee.totalMealAllowance,
          totalPayrollCost: accumulator.totalPayrollCost + employee.netSalary,
        }),
        {
          totalBaseSalary: 0,
          totalBonus: 0,
          totalCommission: 0,
          totalDeduction: 0,
          totalMealAllowance: 0,
          totalPayrollCost: 0,
        },
      ),
    [computedEmployees],
  );

  const selectedEmployee =
    computedEmployees.find((employee) => employee.employeeId === selectedEmployeeId) ??
    computedEmployees[0] ??
    null;
  const exportQuery = useMemo(() => {
    const params = new URLSearchParams({
      businessId: selectedBusinessId,
      businessName: selectedBusinessName,
      endDate: filters.endDate,
      scope: filters.scope,
      startDate: filters.startDate,
    });

    return params.toString();
  }, [filters.endDate, filters.scope, filters.startDate, selectedBusinessId, selectedBusinessName]);

  function resetForm() {
    setEditingAdjustment(null);
    setForm({
      adjustmentDate: filters.endDate,
      amount: 0,
      businessId: selectedBusinessId,
      employeeId: employeesByBusiness.get(selectedBusinessId)?.[0]?.id ?? "",
      notes: "",
      type: "bonus",
    });
  }

  function normalizeAdjustment(adjustment: SalaryAdjustmentRow) {
    return {
      ...adjustment,
      business_name: businessNameMap.get(adjustment.business_id) ?? "Bisnis tidak diketahui",
      employee_name: employeeNameMap.get(adjustment.employee_id) ?? "Karyawan tidak diketahui",
    } satisfies SalaryAdjustmentListItem;
  }

  function hydrateForm(adjustment: SalaryAdjustmentListItem) {
    setEditingAdjustment(adjustment);
    setForm({
      adjustmentDate: adjustment.adjustment_date,
      amount: Number(adjustment.amount),
      businessId: adjustment.business_id,
      employeeId: adjustment.employee_id,
      notes: adjustment.notes ?? "",
      type: adjustment.type === "bonus" ? "bonus" : "deduction",
    });
    setStatusMessage(null);
    setErrorMessage(null);
  }

  async function upsertAdjustment(nextForm: AdjustmentFormState, adjustmentId?: string) {
    setIsSubmitting(true);
    setStatusMessage(null);
    setErrorMessage(null);

    const response = await fetch(
      adjustmentId ? `/api/salary-adjustments/${adjustmentId}` : "/api/salary-adjustments",
      {
        body: JSON.stringify(nextForm),
        headers: {
          "Content-Type": "application/json",
        },
        method: adjustmentId ? "PATCH" : "POST",
      },
    );
    const payload = (await response.json()) as {
      data?: SalaryAdjustmentRow;
      error?: string;
    };

    setIsSubmitting(false);

    if (!response.ok || !payload.data) {
      setErrorMessage(payload.error ?? "Gagal menyimpan penyesuaian gaji.");
      return;
    }

    const normalizedAdjustment = normalizeAdjustment(payload.data);

    setAdjustments((current) =>
      sortAdjustments(
        current.some((adjustment) => adjustment.id === normalizedAdjustment.id)
          ? current.map((adjustment) =>
              adjustment.id === normalizedAdjustment.id ? normalizedAdjustment : adjustment,
            )
          : [normalizedAdjustment, ...current],
      ),
    );

    setStatusMessage(
      adjustmentId
        ? "Penyesuaian gaji berhasil diperbarui."
        : "Penyesuaian gaji berhasil ditambahkan.",
    );
    resetForm();
  }

  async function deleteAdjustment(adjustment: SalaryAdjustmentListItem) {
    setStatusMessage(null);
    setErrorMessage(null);

    const response = await fetch(`/api/salary-adjustments/${adjustment.id}`, {
      method: "DELETE",
    });
    const payload = (await response.json()) as { error?: string };

    if (!response.ok) {
      setErrorMessage(payload.error ?? "Gagal menghapus penyesuaian gaji.");
      return;
    }

    setAdjustments((current) => current.filter((item) => item.id !== adjustment.id));
    setStatusMessage("Penyesuaian gaji berhasil dihapus.");

    if (editingAdjustment?.id === adjustment.id) {
      resetForm();
    }
  }

  if (!computedEmployees.length) {
    return (
      <EmptyState
        description="Belum ada data karyawan aktif pada scope bisnis yang sedang dipilih."
        title="Data payroll belum tersedia"
      />
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="px-0">
          <CardTitle>Filter payroll</CardTitle>
          <CardDescription>
            Perhitungan payroll selalu dinamis dari gaji pokok saat ini, snapshot komisi transaksi,
            dan penyesuaian bonus atau potongan.
          </CardDescription>
        </CardHeader>
        <form className="grid gap-4 lg:grid-cols-[0.8fr_1fr_1fr_auto]">
          <div className="form-field">
            <label className="form-label" htmlFor="payrollScope">
              Scope bisnis
            </label>
            <Select defaultValue={filters.scope} id="payrollScope" name="scope">
              <option value="selected">{selectedBusinessName}</option>
              <option value="combined">Semua bisnis</option>
            </Select>
          </div>
          <div className="form-field">
            <label className="form-label" htmlFor="payrollStartDate">
              Tanggal mulai
            </label>
            <Input
              defaultValue={filters.startDate}
              id="payrollStartDate"
              name="startDate"
              type="date"
            />
          </div>
          <div className="form-field">
            <label className="form-label" htmlFor="payrollEndDate">
              Tanggal akhir
            </label>
            <Input defaultValue={filters.endDate} id="payrollEndDate" name="endDate" type="date" />
          </div>
          <div className="flex items-end gap-3">
            <Button type="submit">Terapkan</Button>
            <Link
              className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-[color:var(--border)] bg-[var(--surface-hover)] px-4 py-2 text-sm font-semibold"
              href="/payroll"
            >
              Reset
            </Link>
          </div>
        </form>
        <div className="mt-4">
          <ReportExportButtons
            actions={[
              { href: `/api/exports/payroll?${exportQuery}`, label: "Export Payroll Excel" },
              {
                href: `/api/exports/payroll?${exportQuery}&format=pdf`,
                label: "Export Payroll PDF",
              },
              { href: `/api/exports/commission?${exportQuery}`, label: "Export Komisi Excel" },
            ]}
          />
        </div>
      </Card>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <Card>
          <CardHeader className="px-0">
            <CardDescription>Total gaji pokok</CardDescription>
            <CardTitle>
              <RupiahFormatter value={summary.totalBaseSalary} />
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="px-0">
            <CardDescription>Total komisi</CardDescription>
            <CardTitle>
              <RupiahFormatter value={summary.totalCommission} />
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="px-0">
            <CardDescription>Total bonus</CardDescription>
            <CardTitle>
              <RupiahFormatter value={summary.totalBonus} />
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="px-0">
            <CardDescription>Total potongan</CardDescription>
            <CardTitle>
              <RupiahFormatter value={summary.totalDeduction} />
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="px-0">
            <CardDescription>Total uang makan</CardDescription>
            <CardTitle>
              <RupiahFormatter value={summary.totalMealAllowance} />
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="px-0">
            <CardDescription>Total biaya payroll</CardDescription>
            <CardTitle>
              <RupiahFormatter value={summary.totalPayrollCost} />
            </CardTitle>
          </CardHeader>
        </Card>
      </section>

      <Card>
        <CardHeader className="px-0">
          <CardTitle>Ringkasan payroll per karyawan</CardTitle>
          <CardDescription>
            Omzet tertangani dan komisi diambil dari snapshot transaksi pada periode yang dipilih.
          </CardDescription>
        </CardHeader>
        <DataTable
          columns={[
            {
              key: "employeeName",
              label: "Karyawan",
              render: (employee) => (
                <div className="space-y-1">
                  <p className="font-semibold">{employee.employeeName}</p>
                  <p className="text-xs text-muted-foreground">{employee.businessName}</p>
                </div>
              ),
            },
            {
              align: "right",
              key: "baseSalary",
              label: "Gaji pokok",
              render: (employee) => <RupiahFormatter value={employee.baseSalary} />,
            },
            {
              align: "right",
              key: "totalHandledServiceAmount",
              label: "Omzet",
              render: (employee) => (
                <RupiahFormatter value={employee.totalHandledServiceAmount} />
              ),
            },
            {
              align: "right",
              key: "totalCommission",
              label: "Komisi",
              render: (employee) => <RupiahFormatter value={employee.totalCommission} />,
            },
            {
              align: "right",
              key: "totalBonus",
              label: "Bonus",
              render: (employee) => <RupiahFormatter value={employee.totalBonus} />,
            },
            {
              align: "right",
              key: "totalDeduction",
              label: "Potongan",
              render: (employee) => <RupiahFormatter value={employee.totalDeduction} />,
            },
            {
              align: "right",
              key: "totalMealAllowance",
              label: "Uang makan",
              render: (employee) => <RupiahFormatter value={employee.totalMealAllowance} />,
            },
            {
              align: "right",
              key: "netSalary",
              label: "Gaji bersih",
              render: (employee) => <RupiahFormatter value={employee.netSalary} />,
            },
            {
              key: "actions",
              label: "Detail",
              render: (employee) => (
                <Button
                  variant="ghost"
                  onClick={() => setSelectedEmployeeId(employee.employeeId)}
                >
                  Lihat detail
                </Button>
              ),
            },
          ]}
          emptyMessage="Belum ada data payroll pada periode ini."
          rowKey={(employee) => employee.employeeId}
          rows={computedEmployees}
        />
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        <Card>
          <CardHeader className="px-0">
            <CardTitle>Salary adjustments</CardTitle>
            <CardDescription>
              Bonus dan potongan mempengaruhi payroll periode aktif secara langsung.
            </CardDescription>
          </CardHeader>
          <DataTable
            columns={[
              {
                key: "adjustment_date",
                label: "Tanggal",
                render: (adjustment) => formatDateLong(adjustment.adjustment_date),
              },
              {
                key: "employee_name",
                label: "Karyawan",
                render: (adjustment) => (
                  <div className="space-y-1">
                    <p className="font-semibold">{adjustment.employee_name}</p>
                    <p className="text-xs text-muted-foreground">{adjustment.business_name}</p>
                  </div>
                ),
              },
              {
                key: "type",
                label: "Tipe",
                render: (adjustment) => (
                  <span className="theme-pill">
                    {adjustment.type === "bonus" ? "Bonus" : "Potongan"}
                  </span>
                ),
              },
              {
                align: "right",
                key: "amount",
                label: "Nominal",
                render: (adjustment) => <RupiahFormatter value={adjustment.amount} />,
              },
              {
                key: "notes",
                label: "Catatan",
                render: (adjustment) => adjustment.notes || "-",
              },
              {
                key: "actions",
                label: "Aksi",
                render: (adjustment) => (
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button className="px-3" variant="ghost" onClick={() => hydrateForm(adjustment)}>
                      <PencilLine className="h-4 w-4" />
                    </Button>
                    <Button
                      className="px-3"
                      variant="danger"
                      onClick={() => setPendingDelete(adjustment)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ),
              },
            ]}
            emptyMessage="Belum ada bonus atau potongan pada periode aktif."
            rowKey={(adjustment) => adjustment.id}
            rows={adjustments}
          />
        </Card>

        <Card>
          <CardHeader className="px-0">
            <CardTitle>
              {editingAdjustment ? "Ubah penyesuaian gaji" : "Tambah penyesuaian gaji"}
            </CardTitle>
            <CardDescription>
              Owner dapat menambah bonus atau potongan tanpa menyimpan payroll sebagai data tetap.
            </CardDescription>
          </CardHeader>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              void upsertAdjustment(form, editingAdjustment?.id);
            }}
          >
            <div className="form-field">
              <label className="form-label" htmlFor="adjustmentBusiness">
                Bisnis
              </label>
              <Select
                disabled={filters.scope === "selected"}
                id="adjustmentBusiness"
                value={form.businessId}
                onChange={(event) => {
                  const nextBusinessId = event.target.value;
                  const defaultEmployee = employeesByBusiness.get(nextBusinessId)?.[0]?.id ?? "";

                  setForm((current) => ({
                    ...current,
                    businessId: nextBusinessId,
                    employeeId: defaultEmployee,
                  }));
                }}
              >
                {businesses.map((business) => (
                  <option key={business.id} value={business.id}>
                    {business.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="form-field">
                <label className="form-label" htmlFor="adjustmentEmployee">
                  Karyawan
                </label>
                <Select
                  id="adjustmentEmployee"
                  required
                  value={form.employeeId}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, employeeId: event.target.value }))
                  }
                >
                  <option value="">Pilih karyawan</option>
                  {(employeesByBusiness.get(form.businessId) ?? []).map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="form-field">
                <label className="form-label" htmlFor="adjustmentType">
                  Tipe
                </label>
                <Select
                  id="adjustmentType"
                  value={form.type}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      type: event.target.value === "deduction" ? "deduction" : "bonus",
                    }))
                  }
                >
                  {SALARY_ADJUSTMENT_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="form-field">
                <label className="form-label" htmlFor="adjustmentAmount">
                  Nominal
                </label>
                <CurrencyInput
                  id="adjustmentAmount"
                  required
                  value={form.amount}
                  onValueChange={(value) =>
                    setForm((current) => ({ ...current, amount: value }))
                  }
                />
              </div>
              <div className="form-field">
                <label className="form-label" htmlFor="adjustmentDate">
                  Tanggal
                </label>
                <Input
                  id="adjustmentDate"
                  required
                  type="date"
                  value={form.adjustmentDate}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, adjustmentDate: event.target.value }))
                  }
                />
              </div>
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="adjustmentNotes">
                Catatan
              </label>
              <Textarea
                id="adjustmentNotes"
                value={form.notes}
                onChange={(event) =>
                  setForm((current) => ({ ...current, notes: event.target.value }))
                }
              />
            </div>
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
              <Button
                disabled={
                  isSubmitting ||
                  !form.businessId ||
                  !form.employeeId ||
                  !form.adjustmentDate ||
                  form.amount <= 0
                }
                type="submit"
              >
                {editingAdjustment ? "Simpan perubahan" : "Tambah penyesuaian"}
              </Button>
              {editingAdjustment ? (
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
      </div>

      {selectedEmployee ? (
        <Card>
          <CardHeader className="px-0">
            <CardTitle>Detail payroll {selectedEmployee.employeeName}</CardTitle>
            <CardDescription>
              Rincian komisi dan salary adjustment untuk periode {formatDateLong(filters.startDate)}{" "}
              sampai {formatDateLong(filters.endDate)}.
            </CardDescription>
          </CardHeader>
          <div className="mb-4 flex flex-wrap gap-3">
            <div className="theme-card-muted p-4">
              <p className="text-sm font-semibold text-muted-foreground">Bisnis</p>
              <p className="mt-1 font-semibold">{selectedEmployee.businessName}</p>
            </div>
            <div className="theme-card-muted p-4">
              <p className="text-sm font-semibold text-muted-foreground">Gaji bersih</p>
              <p className="mt-1 font-semibold">
                <RupiahFormatter value={selectedEmployee.netSalary} />
              </p>
            </div>
            <ReportExportButtons
              actions={[
                {
                  href: `/api/exports/salary-slip?${exportQuery}&employeeId=${selectedEmployee.employeeId}`,
                  label: "Slip Gaji PDF",
                },
              ]}
            />
          </div>
          <div className="grid gap-6 xl:grid-cols-2">
            <div>
              <p className="section-title mb-3">Sumber komisi</p>
              <DataTable
                columns={[
                  {
                    key: "transactionCreatedAt",
                    label: "Tanggal",
                    render: (item) => (
                      <div className="space-y-1">
                        <p className="font-semibold">{formatDateTime(item.transactionCreatedAt)}</p>
                        <p className="text-xs text-muted-foreground">{item.customerName}</p>
                      </div>
                    ),
                  },
                  {
                    key: "serviceName",
                    label: "Layanan",
                    render: (item) => (
                      <div className="space-y-1">
                        <p className="font-semibold">{item.serviceName}</p>
                        <p className="text-xs text-muted-foreground">{item.businessName}</p>
                      </div>
                    ),
                  },
                  {
                    align: "right",
                    key: "price",
                    label: "Harga",
                    render: (item) => <RupiahFormatter value={item.price} />,
                  },
                  {
                    key: "commissionRate",
                    label: "Rate",
                    render: (item) => `${formatCommissionRate(item.commissionRate)}%`,
                  },
                  {
                    align: "right",
                    key: "commissionAmount",
                    label: "Komisi",
                    render: (item) => <RupiahFormatter value={item.commissionAmount} />,
                  },
                ]}
                emptyMessage="Belum ada komisi pada periode ini."
                rowKey={(item) => `${item.transactionId}-${item.serviceName}-${item.customerName}`}
                rows={selectedEmployee.commissionItems}
              />
            </div>
            <div>
              <p className="section-title mb-3">Penyesuaian gaji</p>
              <DataTable
                columns={[
                  {
                    key: "adjustment_date",
                    label: "Tanggal",
                    render: (item) => formatDateLong(item.adjustment_date),
                  },
                  {
                    key: "type",
                    label: "Tipe",
                    render: (item) => (item.type === "bonus" ? "Bonus" : "Potongan"),
                  },
                  {
                    align: "right",
                    key: "amount",
                    label: "Nominal",
                    render: (item) => <RupiahFormatter value={item.amount} />,
                  },
                  {
                    key: "notes",
                    label: "Catatan",
                    render: (item) => item.notes || "-",
                  },
                ]}
                emptyMessage="Belum ada bonus atau potongan untuk karyawan ini."
                rowKey={(item) => item.id}
                rows={selectedEmployee.adjustments}
              />
            </div>
          </div>
        </Card>
      ) : null}

      <ConfirmDialog
        confirmLabel="Hapus"
        description="Penyesuaian gaji yang dihapus akan langsung mengubah perhitungan payroll aktif."
        open={Boolean(pendingDelete)}
        title="Hapus penyesuaian gaji"
        onClose={() => setPendingDelete(null)}
        onConfirm={() => {
          if (!pendingDelete) {
            return;
          }

          void deleteAdjustment(pendingDelete);
        }}
      />
    </div>
  );
}
