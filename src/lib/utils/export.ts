import ExcelJS from "exceljs";

import { APP_NAME } from "@/lib/constants/app";
import type { CustomerListItem } from "@/lib/data/customers";
import type {
  ExpenseListItem,
  FinancialReportData,
  PayrollReportData,
  TransactionListItem,
} from "@/lib/types/app";
import { formatDateTime, formatDateLong } from "@/lib/utils/date";
import {
  formatCommissionRate,
  getEffectiveCommissionRate,
  getServiceEmployeeNames,
  getServiceEmployeeSplits,
  getServiceTotalCommission,
} from "@/lib/utils/transaction-services";

const CURRENCY_FORMAT = '"Rp" #,##0';

function styleHeaderRow(row: ExcelJS.Row) {
  row.font = {
    bold: true,
    color: { argb: "FFFFFFFF" },
  };
  row.fill = {
    fgColor: { argb: "FF6B7280" },
    pattern: "solid",
    type: "pattern",
  };
}

function setCurrencyFormat(worksheet: ExcelJS.Worksheet, columns: string[]) {
  columns.forEach((column) => {
    worksheet.getColumn(column).numFmt = CURRENCY_FORMAT;
  });
}

function autoFitColumns(worksheet: ExcelJS.Worksheet) {
  worksheet.columns.forEach((column) => {
    if (!column) {
      return;
    }

    let maxLength = 14;

    column.eachCell?.({ includeEmpty: true }, (cell) => {
      const text = String(cell.value ?? "");
      maxLength = Math.max(maxLength, text.length + 2);
    });

    column.width = Math.min(maxLength, 40);
  });
}

function createWorkbookBase({
  endDate,
  generatedAt,
  scopeLabel,
  startDate,
  title,
}: {
  endDate: string;
  generatedAt: Date;
  scopeLabel: string;
  startDate: string;
  title: string;
}) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = APP_NAME;
  workbook.created = generatedAt;

  const summarySheet = workbook.addWorksheet("Ringkasan");
  summarySheet.addRow([APP_NAME]);
  summarySheet.addRow([title]);
  summarySheet.addRow(["Bisnis", scopeLabel]);
  summarySheet.addRow(["Periode", `${formatDateLong(startDate)} - ${formatDateLong(endDate)}`]);
  summarySheet.addRow(["Dibuat pada", formatDateTime(generatedAt)]);
  summarySheet.addRow([]);
  summarySheet.getCell("A1").font = { bold: true, size: 14 };
  summarySheet.getCell("A2").font = { bold: true, size: 18 };
  summarySheet.columns = [{ width: 24 }, { width: 28 }];

  return {
    summarySheet,
    workbook,
  };
}

export async function createTransactionWorkbook({
  endDate,
  generatedAt = new Date(),
  includeCommission,
  scopeLabel,
  startDate,
  transactions,
}: {
  endDate: string;
  generatedAt?: Date;
  includeCommission: boolean;
  scopeLabel: string;
  startDate: string;
  transactions: TransactionListItem[];
}) {
  const { summarySheet, workbook } = createWorkbookBase({
    endDate,
    generatedAt,
    scopeLabel,
    startDate,
    title: "Laporan Transaksi",
  });

  summarySheet.addRow(["Total transaksi", transactions.length]);
  summarySheet.addRow([
    "Gross revenue",
    transactions.reduce((sum, transaction) => sum + Number(transaction.total_amount), 0),
  ]);
  summarySheet.addRow([
    "Jumlah layanan",
    transactions.reduce((sum, transaction) => sum + transaction.service_count, 0),
  ]);

  if (includeCommission) {
    summarySheet.addRow([
      "Total komisi",
      transactions.reduce((sum, transaction) => sum + Number(transaction.total_commission), 0),
    ]);
  }

  setCurrencyFormat(summarySheet, ["B"]);

  const transactionSheet = workbook.addWorksheet("Transaksi");
  const transactionHeaders = [
    "Tanggal",
    "Bisnis",
    "ID Transaksi",
    "Pelanggan",
    "Telepon",
    "Pembayaran",
    "Jumlah Layanan",
    "Total Transaksi",
  ];

  if (includeCommission) {
    transactionHeaders.push("Total Komisi");
  }

  transactionSheet.addRow(transactionHeaders);
  styleHeaderRow(transactionSheet.getRow(1));

  transactions.forEach((transaction) => {
    const row: Array<number | string> = [
      formatDateTime(transaction.created_at),
      transaction.business?.name ?? "Bisnis tidak diketahui",
      transaction.id,
      transaction.customer_name,
      transaction.customer_phone ?? "-",
      transaction.payment_method.toUpperCase(),
      transaction.service_count,
      Number(transaction.total_amount),
    ];

    if (includeCommission) {
      row.push(Number(transaction.total_commission));
    }

    transactionSheet.addRow(row);
  });

  setCurrencyFormat(transactionSheet, includeCommission ? ["H", "I"] : ["H"]);
  autoFitColumns(transactionSheet);

  const detailSheet = workbook.addWorksheet("Detail Layanan");
  const detailHeaders = [
    "Tanggal",
    "Bisnis",
    "ID Transaksi",
    "Pelanggan",
    "Layanan",
    "Karyawan",
    "Harga",
  ];

  if (includeCommission) {
    detailHeaders.push("Rate Komisi", "Nilai Komisi");
  }

  detailSheet.addRow(detailHeaders);
  styleHeaderRow(detailSheet.getRow(1));

  transactions.forEach((transaction) => {
      transaction.transaction_services.forEach((service) => {
      const row: Array<number | string> = [
        formatDateTime(transaction.created_at),
        transaction.business?.name ?? "Bisnis tidak diketahui",
        transaction.id,
        transaction.customer_name,
        service.service_name_snapshot,
        getServiceEmployeeNames(service),
        Number(service.price_snapshot),
      ];

      if (includeCommission) {
        row.push(
          getServiceEmployeeSplits(service)
            .map(
              (employee) =>
                `${employee.employee_name_snapshot} ${formatCommissionRate(
                  getEffectiveCommissionRate(employee),
                )}%`,
            )
            .join(", "),
          getServiceTotalCommission(service),
        );
      }

      detailSheet.addRow(row);
    });
  });

  setCurrencyFormat(detailSheet, includeCommission ? ["G", "I"] : ["G"]);
  autoFitColumns(detailSheet);

  return workbook;
}

export async function createCustomerWorkbook({
  customers,
  generatedAt = new Date(),
  scopeLabel,
}: {
  customers: CustomerListItem[];
  generatedAt?: Date;
  scopeLabel: string;
}) {
  const today = generatedAt.toISOString().slice(0, 10);
  const { summarySheet, workbook } = createWorkbookBase({
    endDate: today,
    generatedAt,
    scopeLabel,
    startDate: today,
    title: "Data Customer",
  });

  summarySheet.addRow(["Total customer", customers.length]);
  summarySheet.addRow([
    "Total spending",
    customers.reduce((sum, customer) => sum + Number(customer.total_spending), 0),
  ]);
  setCurrencyFormat(summarySheet, ["B"]);

  const customerSheet = workbook.addWorksheet("Customer");
  customerSheet.addRow([
    "Nama",
    "Telepon",
    "Bisnis",
    "Total Kunjungan",
    "Total Spending",
    "Kunjungan Terakhir",
    "Tanggal Dibuat",
  ]);
  styleHeaderRow(customerSheet.getRow(1));

  customers.forEach((customer) => {
    customerSheet.addRow([
      customer.name,
      customer.phone ?? "-",
      customer.business_names.join(", ") || "-",
      customer.total_visits,
      customer.total_spending,
      customer.last_visit ? formatDateTime(customer.last_visit) : "-",
      formatDateTime(customer.created_at),
    ]);
  });

  setCurrencyFormat(customerSheet, ["E"]);
  autoFitColumns(customerSheet);

  return workbook;
}

export async function createExpenseWorkbook({
  endDate,
  expenses,
  generatedAt = new Date(),
  scopeLabel,
  startDate,
}: {
  endDate: string;
  expenses: ExpenseListItem[];
  generatedAt?: Date;
  scopeLabel: string;
  startDate: string;
}) {
  const { summarySheet, workbook } = createWorkbookBase({
    endDate,
    generatedAt,
    scopeLabel,
    startDate,
    title: "Laporan Pengeluaran",
  });

  summarySheet.addRow(["Jumlah entri", expenses.length]);
  summarySheet.addRow([
    "Total pengeluaran",
    expenses.reduce((sum, expense) => sum + Number(expense.amount), 0),
  ]);
  setCurrencyFormat(summarySheet, ["B"]);

  const detailSheet = workbook.addWorksheet("Pengeluaran");
  detailSheet.addRow([
    "Tanggal",
    "Bisnis",
    "Kategori",
    "Nama",
    "Nominal",
    "Catatan",
  ]);
  styleHeaderRow(detailSheet.getRow(1));

  expenses.forEach((expense) => {
    detailSheet.addRow([
      formatDateLong(expense.expense_date),
      expense.business?.name ?? "Bisnis tidak diketahui",
      expense.category,
      expense.name,
      Number(expense.amount),
      expense.notes ?? "-",
    ]);
  });

  setCurrencyFormat(detailSheet, ["E"]);
  autoFitColumns(detailSheet);

  return workbook;
}

export async function createPayrollWorkbook({
  generatedAt = new Date(),
  payroll,
}: {
  generatedAt?: Date;
  payroll: PayrollReportData;
}) {
  const { summarySheet, workbook } = createWorkbookBase({
    endDate: payroll.endDate,
    generatedAt,
    scopeLabel: payroll.scopeLabel,
    startDate: payroll.startDate,
    title: "Laporan Payroll",
  });

  summarySheet.addRow(["Total gaji pokok", payroll.summary.totalBaseSalary]);
  summarySheet.addRow(["Total komisi", payroll.summary.totalCommission]);
  summarySheet.addRow(["Total bonus", payroll.summary.totalBonus]);
  summarySheet.addRow(["Total potongan", payroll.summary.totalDeduction]);
  summarySheet.addRow(["Total uang makan", payroll.summary.totalMealAllowance]);
  summarySheet.addRow(["Total biaya payroll", payroll.summary.totalPayrollCost]);
  setCurrencyFormat(summarySheet, ["B"]);

  const payrollSheet = workbook.addWorksheet("Payroll");
  payrollSheet.addRow([
    "Nama Karyawan",
    "Bisnis",
    "Gaji Pokok",
    "Omzet Layanan",
    "Komisi",
    "Bonus",
    "Potongan",
    "Uang Makan",
    "Potongan Absensi",
    "Gaji Bersih",
  ]);
  styleHeaderRow(payrollSheet.getRow(1));

  payroll.employees.forEach((employee) => {
    payrollSheet.addRow([
      employee.employeeName,
      employee.businessName,
      employee.baseSalary,
      employee.totalHandledServiceAmount,
      employee.totalCommission,
      employee.totalBonus,
      employee.totalDeduction,
      employee.totalMealAllowance,
      employee.totalAttendanceDeduction,
      employee.netSalary,
    ]);
  });

  setCurrencyFormat(payrollSheet, ["C", "D", "E", "F", "G", "H", "I", "J"]);
  autoFitColumns(payrollSheet);

  const adjustmentSheet = workbook.addWorksheet("Penyesuaian");
  adjustmentSheet.addRow([
    "Tanggal",
    "Bisnis",
    "Karyawan",
    "Tipe",
    "Nominal",
    "Catatan",
  ]);
  styleHeaderRow(adjustmentSheet.getRow(1));

  payroll.adjustments.forEach((adjustment) => {
    adjustmentSheet.addRow([
      formatDateLong(adjustment.adjustment_date),
      adjustment.business_name,
      adjustment.employee_name,
      adjustment.type === "bonus" ? "Bonus" : "Potongan",
      Number(adjustment.amount),
      adjustment.notes ?? "-",
    ]);
  });

  setCurrencyFormat(adjustmentSheet, ["E"]);
  autoFitColumns(adjustmentSheet);

  const commissionSheet = workbook.addWorksheet("Komisi Detail");
  commissionSheet.addRow([
    "Tanggal",
    "Bisnis",
    "Karyawan",
    "Pelanggan",
    "Layanan",
    "Harga",
    "Rate Komisi",
    "Nilai Komisi",
  ]);
  styleHeaderRow(commissionSheet.getRow(1));

  payroll.employees.forEach((employee) => {
    employee.commissionItems.forEach((item) => {
      commissionSheet.addRow([
        formatDateTime(item.transactionCreatedAt),
        item.businessName,
        employee.employeeName,
        item.customerName,
        item.serviceName,
        item.price,
        `${formatCommissionRate(item.commissionRate)}%`,
        item.commissionAmount,
      ]);
    });
  });

  setCurrencyFormat(commissionSheet, ["F", "H"]);
  autoFitColumns(commissionSheet);

  return workbook;
}

export async function createFinancialWorkbook({
  generatedAt = new Date(),
  report,
}: {
  generatedAt?: Date;
  report: FinancialReportData;
}) {
  const { summarySheet, workbook } = createWorkbookBase({
    endDate: report.endDate,
    generatedAt,
    scopeLabel: report.scopeLabel,
    startDate: report.startDate,
    title: "Laporan Keuangan",
  });

  summarySheet.addRow(["Gross revenue", report.summary.grossRevenue]);
  summarySheet.addRow(["Total transaksi", report.summary.totalTransactions]);
  summarySheet.addRow(["Total layanan", report.summary.totalServicesHandled]);
  summarySheet.addRow(["Total komisi", report.summary.totalCommission]);
  summarySheet.addRow(["Total pengeluaran", report.summary.totalExpenses]);
  summarySheet.addRow(["Estimasi laba bersih", report.summary.estimatedNetProfit]);
  setCurrencyFormat(summarySheet, ["B"]);

  const paymentSheet = workbook.addWorksheet("Pembayaran");
  paymentSheet.addRow(["Metode", "Jumlah Transaksi", "Total"]);
  styleHeaderRow(paymentSheet.getRow(1));
  report.paymentMethodBreakdown.forEach((row) => {
    paymentSheet.addRow([row.method.toUpperCase(), row.totalTransactions, row.totalAmount]);
  });
  setCurrencyFormat(paymentSheet, ["C"]);
  autoFitColumns(paymentSheet);

  const businessSheet = workbook.addWorksheet("Revenue Bisnis");
  businessSheet.addRow(["Bisnis", "Jumlah Transaksi", "Revenue"]);
  styleHeaderRow(businessSheet.getRow(1));
  report.revenueByBusiness.forEach((row) => {
    businessSheet.addRow([row.businessName, row.totalTransactions, row.totalRevenue]);
  });
  setCurrencyFormat(businessSheet, ["C"]);
  autoFitColumns(businessSheet);

  const commissionSheet = workbook.addWorksheet("Komisi Karyawan");
  commissionSheet.addRow([
    "Bisnis",
    "Karyawan",
    "Jumlah Layanan",
    "Omzet Tertangani",
    "Total Komisi",
  ]);
  styleHeaderRow(commissionSheet.getRow(1));
  report.commissionByEmployee.forEach((row) => {
    commissionSheet.addRow([
      row.businessName,
      row.employeeName,
      row.handledServices,
      row.handledRevenue,
      row.totalCommission,
    ]);
  });
  setCurrencyFormat(commissionSheet, ["D", "E"]);
  autoFitColumns(commissionSheet);

  const topServicesSheet = workbook.addWorksheet("Layanan Teratas");
  topServicesSheet.addRow(["Bisnis", "Layanan", "Jumlah", "Revenue"]);
  styleHeaderRow(topServicesSheet.getRow(1));
  report.topServices.forEach((row) => {
    topServicesSheet.addRow([
      row.businessName,
      row.serviceName,
      row.totalServices,
      row.totalRevenue,
    ]);
  });
  setCurrencyFormat(topServicesSheet, ["D"]);
  autoFitColumns(topServicesSheet);

  const topEmployeesSheet = workbook.addWorksheet("Karyawan Teratas");
  topEmployeesSheet.addRow([
    "Bisnis",
    "Karyawan",
    "Jumlah Layanan",
    "Omzet",
    "Komisi",
  ]);
  styleHeaderRow(topEmployeesSheet.getRow(1));
  report.topEmployees.forEach((row) => {
    topEmployeesSheet.addRow([
      row.businessName,
      row.employeeName,
      row.handledServices,
      row.handledRevenue,
      row.totalCommission,
    ]);
  });
  setCurrencyFormat(topEmployeesSheet, ["D", "E"]);
  autoFitColumns(topEmployeesSheet);

  return workbook;
}
