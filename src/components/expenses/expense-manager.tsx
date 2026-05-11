"use client";

import { useMemo, useState } from "react";
import { PencilLine, Plus, Trash2 } from "lucide-react";

import { ReportExportButtons } from "@/components/reports/report-export-buttons";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { CurrencyInput } from "@/components/ui/currency-input";
import { DataTable } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { RupiahFormatter } from "@/components/ui/rupiah-formatter";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { EXPENSE_CATEGORY_OPTIONS } from "@/lib/constants/app";
import type { AppBusiness, ExpenseListItem } from "@/lib/types/app";
import { formatDateLong } from "@/lib/utils/date";
import { toNumber } from "@/lib/utils/currency";

type ExpenseFormState = {
  amount: number;
  businessId: string;
  category: string;
  expenseDate: string;
  name: string;
  notes: string;
};

function sortExpenses(expenses: ExpenseListItem[]) {
  return [...expenses].sort((left, right) => {
    const dateCompare = right.expense_date.localeCompare(left.expense_date);

    if (dateCompare !== 0) {
      return dateCompare;
    }

    return right.created_at.localeCompare(left.created_at);
  });
}

export function ExpenseManager({
  businesses,
  currentDate,
  initialEndDate,
  initialExpenses,
  initialStartDate,
  selectedBusinessId,
  selectedBusinessName,
}: {
  businesses: AppBusiness[];
  currentDate: string;
  initialEndDate: string;
  initialExpenses: ExpenseListItem[];
  initialStartDate: string;
  selectedBusinessId: string;
  selectedBusinessName: string;
}) {
  const [expenses, setExpenses] = useState(sortExpenses(initialExpenses));
  const [search, setSearch] = useState("");
  const [scope, setScope] = useState<"selected" | "combined">("selected");
  const [startDate, setStartDate] = useState(initialStartDate);
  const [endDate, setEndDate] = useState(initialEndDate);
  const [editingExpense, setEditingExpense] = useState<ExpenseListItem | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ExpenseListItem | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState<ExpenseFormState>({
    amount: 0,
    businessId: selectedBusinessId,
    category: "operational",
    expenseDate: currentDate,
    name: "",
    notes: "",
  });

  const filteredExpenses = useMemo(() => {
    return expenses.filter((expense) => {
      const matchesScope =
        scope === "combined" ? true : expense.business?.id === selectedBusinessId;
      const matchesSearch = search.trim()
        ? [expense.name, expense.notes ?? ""].some((value) =>
            value.toLowerCase().includes(search.trim().toLowerCase()),
          )
        : true;
      const matchesStart = startDate ? expense.expense_date >= startDate : true;
      const matchesEnd = endDate ? expense.expense_date <= endDate : true;

      return matchesScope && matchesSearch && matchesStart && matchesEnd;
    });
  }, [endDate, expenses, scope, search, selectedBusinessId, startDate]);

  const filteredTotal = useMemo(
    () => filteredExpenses.reduce((sum, expense) => sum + toNumber(expense.amount), 0),
    [filteredExpenses],
  );

  const exportHref = useMemo(() => {
    const params = new URLSearchParams({
      businessId: selectedBusinessId,
      businessName: selectedBusinessName,
      endDate,
      scope,
      startDate,
    });

    if (search.trim()) {
      params.set("search", search.trim());
    }

    return `/api/exports/expenses?${params.toString()}`;
  }, [endDate, scope, search, selectedBusinessId, selectedBusinessName, startDate]);

  function resetForm() {
    setEditingExpense(null);
    setForm({
      amount: 0,
      businessId: selectedBusinessId,
      category: "operational",
      expenseDate: currentDate,
      name: "",
      notes: "",
    });
  }

  function hydrateForm(expense: ExpenseListItem) {
    setEditingExpense(expense);
    setForm({
      amount: Number(expense.amount),
      businessId: expense.business_id,
      category: expense.category,
      expenseDate: expense.expense_date,
      name: expense.name,
      notes: expense.notes ?? "",
    });
    setStatusMessage(null);
    setErrorMessage(null);
  }

  function normalizeExpense(rawExpense: ExpenseListItem) {
    const business = businesses.find((item) => item.id === rawExpense.business_id);

    return {
      ...rawExpense,
      business: business
        ? {
            id: business.id,
            name: business.name,
            slug: business.slug,
            theme: business.theme,
          }
        : rawExpense.business,
    } satisfies ExpenseListItem;
  }

  async function upsertExpense(nextForm: ExpenseFormState, expenseId?: string) {
    setIsSubmitting(true);
    setStatusMessage(null);
    setErrorMessage(null);

    const response = await fetch(expenseId ? `/api/expenses/${expenseId}` : "/api/expenses", {
      body: JSON.stringify(nextForm),
      headers: {
        "Content-Type": "application/json",
      },
      method: expenseId ? "PATCH" : "POST",
    });
    const payload = (await response.json()) as {
      data?: ExpenseListItem;
      error?: string;
    };

    setIsSubmitting(false);

    if (!response.ok || !payload.data) {
      setErrorMessage(payload.error ?? "Gagal menyimpan pengeluaran.");
      return;
    }

    const normalizedExpense = normalizeExpense(payload.data);

    setExpenses((current) =>
      sortExpenses(
        current.some((expense) => expense.id === normalizedExpense.id)
          ? current.map((expense) =>
              expense.id === normalizedExpense.id ? normalizedExpense : expense,
            )
          : [normalizedExpense, ...current],
      ),
    );

    setStatusMessage(
      expenseId ? "Pengeluaran berhasil diperbarui." : "Pengeluaran berhasil ditambahkan.",
    );
    resetForm();
  }

  async function deleteExpense(expense: ExpenseListItem) {
    setErrorMessage(null);
    setStatusMessage(null);

    const response = await fetch(`/api/expenses/${expense.id}`, {
      method: "DELETE",
    });
    const payload = (await response.json()) as { error?: string };

    if (!response.ok) {
      setErrorMessage(payload.error ?? "Gagal menghapus pengeluaran.");
      return;
    }

    setExpenses((current) => current.filter((item) => item.id !== expense.id));
    setStatusMessage("Pengeluaran berhasil dihapus.");

    if (editingExpense?.id === expense.id) {
      resetForm();
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="px-0">
          <CardTitle>Filter pengeluaran</CardTitle>
          <CardDescription>
            Pantau total pengeluaran per bisnis dan periode tanpa keluar dari aplikasi.
          </CardDescription>
        </CardHeader>
        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr]">
          <div className="form-field">
            <label className="form-label" htmlFor="expenseSearch">
              Cari nama atau catatan
            </label>
            <Input
              id="expenseSearch"
              placeholder="Contoh: listrik, perbaikan kursi"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <div className="form-field">
            <label className="form-label" htmlFor="expenseScope">
              Scope bisnis
            </label>
            <Select
              id="expenseScope"
              value={scope}
              onChange={(event) => {
                const nextScope =
                  event.target.value === "combined" ? "combined" : "selected";

                setScope(nextScope);

                if (nextScope === "selected") {
                  setForm((current) => ({ ...current, businessId: selectedBusinessId }));
                }
              }}
            >
              <option value="selected">{selectedBusinessName}</option>
              <option value="combined">Semua bisnis</option>
            </Select>
          </div>
          <div className="form-field">
            <label className="form-label" htmlFor="expenseStartDate">
              Tanggal mulai
            </label>
            <Input
              id="expenseStartDate"
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
            />
          </div>
          <div className="form-field">
            <label className="form-label" htmlFor="expenseEndDate">
              Tanggal akhir
            </label>
            <Input
              id="expenseEndDate"
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
            />
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="theme-card-muted flex items-center justify-between gap-4 p-4 md:max-w-sm">
            <div>
              <p className="text-sm font-semibold text-muted-foreground">Total filter aktif</p>
              <p className="mt-1 text-xl font-semibold">
                <RupiahFormatter value={filteredTotal} />
              </p>
            </div>
            <p className="text-sm text-muted-foreground">{filteredExpenses.length} entri</p>
          </div>
          <ReportExportButtons actions={[{ href: exportHref, label: "Export Excel" }]} />
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader className="px-0">
            <CardTitle>Daftar pengeluaran</CardTitle>
            <CardDescription>
              Semua nominal menggunakan format Rupiah dan tetap dipisahkan per bisnis.
            </CardDescription>
          </CardHeader>
          <DataTable
            columns={[
              {
                key: "expense_date",
                label: "Tanggal",
                render: (expense) => (
                  <div className="space-y-1">
                    <p className="font-semibold">{formatDateLong(expense.expense_date)}</p>
                    <p className="text-xs text-muted-foreground">
                      {expense.business?.name ?? "Bisnis tidak diketahui"}
                    </p>
                  </div>
                ),
              },
              {
                key: "category",
                label: "Kategori",
                render: (expense) => (
                  <span className="theme-pill capitalize">{expense.category.replaceAll("_", " ")}</span>
                ),
              },
              {
                key: "name",
                label: "Nama",
                render: (expense) => (
                  <div className="space-y-1">
                    <p className="font-semibold">{expense.name}</p>
                    <p className="text-xs leading-5 text-muted-foreground">
                      {expense.notes || "Tanpa catatan"}
                    </p>
                  </div>
                ),
              },
              {
                align: "right",
                key: "amount",
                label: "Nominal",
                render: (expense) => <RupiahFormatter value={expense.amount} />,
              },
              {
                key: "actions",
                label: "Aksi",
                render: (expense) => (
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button className="px-3" variant="ghost" onClick={() => hydrateForm(expense)}>
                      <PencilLine className="h-4 w-4" />
                    </Button>
                    <Button
                      className="px-3"
                      variant="danger"
                      onClick={() => setPendingDelete(expense)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ),
              },
            ]}
            emptyMessage="Belum ada pengeluaran pada filter yang dipilih."
            rowKey={(expense) => expense.id}
            rows={filteredExpenses}
          />
        </Card>

        <Card>
          <CardHeader className="px-0">
            <CardTitle>{editingExpense ? "Ubah pengeluaran" : "Tambah pengeluaran"}</CardTitle>
            <CardDescription>
              Owner dapat menambah, memperbarui, dan menghapus pengeluaran per bisnis.
            </CardDescription>
          </CardHeader>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              void upsertExpense(form, editingExpense?.id);
            }}
          >
            <div className="form-field">
              <label className="form-label" htmlFor="expenseBusiness">
                Bisnis
              </label>
              <Select
                disabled={scope === "selected"}
                id="expenseBusiness"
                value={form.businessId}
                onChange={(event) =>
                  setForm((current) => ({ ...current, businessId: event.target.value }))
                }
              >
                {businesses.map((business) => (
                  <option key={business.id} value={business.id}>
                    {business.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="expenseName">
                Nama pengeluaran
              </label>
              <Input
                id="expenseName"
                required
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({ ...current, name: event.target.value }))
                }
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="form-field">
                <label className="form-label" htmlFor="expenseCategory">
                  Kategori
                </label>
                <Select
                  id="expenseCategory"
                  required
                  value={form.category}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, category: event.target.value }))
                  }
                >
                  {EXPENSE_CATEGORY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="form-field">
                <label className="form-label" htmlFor="expenseDate">
                  Tanggal
                </label>
                <Input
                  id="expenseDate"
                  required
                  type="date"
                  value={form.expenseDate}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, expenseDate: event.target.value }))
                  }
                />
              </div>
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="expenseAmount">
                Nominal
              </label>
              <CurrencyInput
                id="expenseAmount"
                required
                value={form.amount}
                onValueChange={(value) =>
                  setForm((current) => ({ ...current, amount: value }))
                }
              />
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="expenseNotes">
                Catatan
              </label>
              <Textarea
                id="expenseNotes"
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
                  !form.name.trim() ||
                  !form.category ||
                  !form.expenseDate ||
                  form.amount <= 0
                }
                type="submit"
              >
                {editingExpense ? "Simpan perubahan" : "Tambah pengeluaran"}
              </Button>
              {editingExpense ? (
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

      <ConfirmDialog
        confirmLabel="Hapus"
        description="Pengeluaran yang dihapus tidak akan muncul di laporan aktif."
        open={Boolean(pendingDelete)}
        title="Hapus pengeluaran"
        onClose={() => setPendingDelete(null)}
        onConfirm={() => {
          if (!pendingDelete) {
            return;
          }

          void deleteExpense(pendingDelete);
        }}
      />
    </div>
  );
}
